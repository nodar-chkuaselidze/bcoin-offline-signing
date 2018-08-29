'use strict';

const assert = require('assert');
const Config = require('bcfg');
const {Network} = require('bcoin');
const MultisigClient = require('bmultisig/lib/client');
const bledger = require('bledger');
const {Device} = bledger.HID;
const {LedgerBcoin} = bledger;

(async () => {
  const config = new Config('bcoin', {
    alias: {
      'n': 'network',
      'w': 'walletname',
      'k': 'api-key',
      't': 'token'
    }
  });

  config.load({
    env: true,
    argv: true
  });

  const walletName = config.str([0, 'walletname']);
  const networkName = config.str('network');
  const network = Network.get(networkName);
  const token = config.str('token');
  const apiKey = config.str('api-key');
  const timeout = config.str('timeout', 10000);

  assert(walletName, 'Wallet name is necessary');

  const m = config.int('m', 2);
  const n = config.int('n', 2);

  // create Multisig Client
  const msclient = new MultisigClient({
    port: network.walletPort,
    apiKey: apiKey,
    token: token
  });

  // initialize ledger
  const devices = await Device.getDevices();
  const device = new Device({
    device: devices[0],
    timeout: timeout
  });

  await device.open();

  const ledgerApp = new LedgerBcoin({ device });

  // collect xpubs
  const xpubs = [];

  for (let i = 0; i < n; i++) {
    const coinType = network.keyPrefix.coinType;
    const path = `m/44'/${coinType}'/${i}'`;

    const HDXPub = await ledgerApp.getPublicKey(path);
    const xpub = HDXPub.xpubkey(network);

    xpubs.push(xpub);
  }

  const cosignerName = 'cosigner-0';

  const wallet = await msclient.createWallet(walletName, {
    m: m,
    n: n,
    cosignerName: cosignerName,
    xpub: xpubs[0]
  });

  const cosignerTokens = [];
  cosignerTokens.push(wallet.cosigners[0].token);

  console.log(`Cosigner token for 0: ${wallet.cosigners[0].token}`);

  // save cosigner token
  const walletClient = msclient.wallet(walletName, token);
  const joinKey = wallet.joinKey;

  for (let i = 1; i < n; i++) {
    const xpub = xpubs[i];
    const cosignerName = `cosigner-${i}`;

    const wallet = await walletClient.joinWallet({ cosignerName, xpub, joinKey });

    cosignerTokens.push(wallet.cosigners[i].token);
    console.log(`Cosigner token for ${i}: ${wallet.cosigners[i].token}`);
  }

  console.log('-- save cosigner tokens..');
  console.log(cosignerTokens.join(','));
})().catch((e) => {
  console.error('Error.');
  console.error(e);
});

