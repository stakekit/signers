/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { ledger as BinanceChain } from '@binance-chain/javascript-sdk';
import CosmosLedgerApp from '@ledgerhq/hw-app-cosmos';
import EthLedgerApp from '@ledgerhq/hw-app-eth';
import SolanaLedgerApp from '@ledgerhq/hw-app-solana';
import Near from '@ledgerhq/hw-app-near';

import Transport from '@ledgerhq/hw-transport';
import AvaxLedgerApp from '@obsidiansystems/hw-app-avalanche';
import {
  HDPathTemplate,
  LedgerSigner as TezosLedgerApp,
} from '@taquito/ledger-signer';

import { LedgerApps } from '../constants';

const resolver: {
  [x in LedgerApps]: (transport: Transport) => Promise<boolean>;
} = {
  [LedgerApps.Avalanche]: async (t) => {
    const app = new AvaxLedgerApp(t);
    return !!(await app.getAppConfiguration());
  },
  [LedgerApps.Ethereum]: async (t) => {
    const app = new EthLedgerApp(t);
    return !!(await app.getAppConfiguration());
  },
  [LedgerApps.NEAR]: async (t) => {
    const app = new Near(t);
    return !!app.transport;
  },
  [LedgerApps.Tezos]: async (t) => {
    const signer = new TezosLedgerApp(t, HDPathTemplate(0), false);
    return !!(await signer.publicKeyHash());
  },
  [LedgerApps.Binance]: async (t) => {
    const app = new BinanceChain.LedgerApp(t);
    return !!(await app.getVersion());
  },
  [LedgerApps.Solana]: async (t) => {
    const app = new SolanaLedgerApp(t);
    return !!(await app.getAppConfiguration());
  },
  [LedgerApps.Cosmos]: async (t) => {
    const app = new CosmosLedgerApp(t);
    const config = await app.getAppConfiguration();
    return config.device_locked === false;
  },
};

export function isTransportConnected(transport: Transport, app: LedgerApps) {
  return resolver[app](transport);
}
