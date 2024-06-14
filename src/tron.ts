import { TronWeb } from 'tronweb';
import { HttpProvider } from 'tronweb/lib/esm/lib/providers';
import {
  WalletOptions,
  isLedgerOptions,
  walletDerivationPaths,
} from './constants';

const TRON_HOST = 'https://api.trongrid.io';

export const getTronWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    // TODO add ledger support
    throw new Error('Ledger mode is not supported.');
  }

  const { mnemonic, walletType, index } = options;
  const privateKey: string = TronWeb.fromMnemonic(
    mnemonic,
    walletDerivationPaths[walletType].tron(index),
  ).privateKey;

  const fullNode = new HttpProvider(TRON_HOST);
  const solidityNode = new HttpProvider(TRON_HOST);
  const eventServer = new HttpProvider(TRON_HOST);

  const tronWallet = new TronWeb(
    fullNode,
    solidityNode,
    eventServer,
    privateKey.substring(2),
  );

  return tronWallet;
};
