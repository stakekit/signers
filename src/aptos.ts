import { Ed25519Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
import { derivePath } from 'ed25519-hd-key';
import { getSeed } from './common';
import { WalletOptions, isLedgerOptions, aptosPath } from './constants';

export const getAptosWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    // TODO: Add Ledger support when available
    throw new Error('Ledger support for Aptos not yet implemented');
  }

  const { mnemonic, index } = options;
  const seed = await getSeed(mnemonic);

  const derivationPath = aptosPath(index);

  try {
    const { key } = derivePath(
      derivationPath,
      Buffer.from(seed).toString('hex'),
    );

    const privateKey = new Ed25519PrivateKey(key);
    return new Ed25519Account({ privateKey });
  } catch (error) {
    throw new Error(
      `Failed to create Aptos wallet: ${(error as Error).message}`,
    );
  }
};
