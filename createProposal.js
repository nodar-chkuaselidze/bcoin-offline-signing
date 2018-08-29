'use strict';

const assert = require('assert');
const Config = require('bcfg');
const {Network, Amount} = require('bcoin');
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
      'a': 'address'
    }
  });

  config.load({
    env: true,
    argv: true
  });

  const walletName = config.str([0, 'walletname']);
  const proposalName = config.str([1, 'proposalname'], 'proposal');
  const networkName = config.str('network', 'main');
  const network = Network.get(networkName);
  const apiKey = config.str('api-key');
  const timeout = config.str('timeout', 10000);
  const tokens = config.array('tokens');
  const address = config.str('address', 'RVPYNXhiBxfkQhXcjV5fuNGdp8oQXfn8cN');
  const value = config.int('value', 1);

  assert(walletName, 'Wallet name is necessary');

  // initialize ledger
  const devices = await Device.getDevices();
  const device = new Device({
    device: devices[0],
    timeout: timeout
  });

  await device.open();

  const ledgerApp = new LedgerBcoin({ device });

  // create Multisig Client
  const msclient = new MultisigClient({
    port: network.walletPort,
    apiKey: apiKey
  });

  // create cosigner clients
  const walletClients = [];

  for (const token of tokens) {
    const walletClient = msclient.wallet(walletName, token);
    walletClients.push(walletClient);
  }

  const proposal = await walletClients[0].createProposal(proposalName, {
    subtractFee: true,
    outputs: [{
      address: address,
      value: Amount.fromBTC(value).toValue()
    }]
  });

  console.log(proposal)
})().catch((e) => {
  console.error('Error.');
  console.error(e);
});

