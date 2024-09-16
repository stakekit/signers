import { mnemonicToWalletKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import { WalletOptions, isLedgerOptions } from './constants';

export const getTonWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    // TODO add ledger support
    throw new Error('Ledger mode is not supported.');
  }

  const { mnemonic } = options;
  const key = await mnemonicToWalletKey(mnemonic.split(' '));
  return {
    wallet: WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 }),
    key,
  };
};
