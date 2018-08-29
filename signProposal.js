'use strict';

const assert = require('assert');
const Config = require('bcfg');
const {Coin, Network, Amount, MTX} = require('bcoin');
const MultisigClient = require('bmultisig/lib/client');
const bledger = require('bledger');
const {Device} = bledger.HID;
const {LedgerBcoin, LedgerTXInput} = bledger;

(async () => {
  const config = new Config('bcoin', {
    alias: {
      'n': 'network',
      'w': 'walletname',
      'k': 'api-key'
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
  const cosigner = config.int('cosigner', 0);
  const witness = config.bool('witness', true);

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

  const walletClient = msclient.wallet(walletName, tokens[cosigner]);
  const ptx = await walletClient.getProposalMTX(proposalName, {
    scripts: true,
    paths: true
  });

  assert(ptx, 'Could not get Proposal MTX.');

  const mtx = MTX.fromJSON(ptx.tx);
  const coinType = network.keyPrefix.coinType;

  const ledgerInputs = [];
  const {paths, scripts} = ptx;

  for (const [i, input] of mtx.inputs.entries()) {
    const path = `m/44'/${coinType}'/${cosigner}'/${paths[i].branch}/${paths[i].index}`;
    const redeem = Buffer.from(scripts[i]);
    const coin = mtx.view.getCoinFor(input);

    const ledgerInput = new LedgerTXInput({ witness, redeem, coin, path });

    ledgerInputs.push(ledgerInput);
  }

  const signatures = await ledgerApp.getTransactionSignatures(mtx, mtx.view, ledgerInputs);

  // approve transaction
  const proposal = await walletClient.approveProposal(
    proposalName,
    signatures
  );

  console.log(proposal);
  console.log('---Signatures:', signatures.map(s => s.toString('hex')).join(','));
})().catch((e) => {
  console.error('Error.');
  console.error(e);
});

