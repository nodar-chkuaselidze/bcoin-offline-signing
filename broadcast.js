'use strict';

const assert = require('assert');
const Config = require('bcfg');
const {Network, Amount} = require('bcoin');
const MultisigClient = require('bmultisig/lib/client');

(async () => {
  const config = new Config('bcoin', {
    alias: {
      'n': 'network',
      'w': 'walletname',
      'k': 'api-key',
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
  const token = config.str('token');

  assert(walletName, 'Wallet name is necessary');

  // create Multisig Client
  const msclient = new MultisigClient({
    port: network.walletPort,
    apiKey: apiKey
  });

  const walletClient = msclient.wallet(walletName, token);
  const tx = await walletClient.sendProposal(proposalName);

  console.log(tx);
})().catch((e) => {
  console.error('Error.');
  console.error(e);
});

