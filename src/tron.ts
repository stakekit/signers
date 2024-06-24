import { TronWeb } from 'tronweb';
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

  const tronWallet = new TronWeb(
    TRON_HOST,
    TRON_HOST,
    TRON_HOST,
    privateKey.substring(2),
  );

  return tronWallet;
};
