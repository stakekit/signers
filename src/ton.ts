import { mnemonicToWalletKey } from '@ton/crypto';
import { TonClient, WalletContractV4 } from '@ton/ton';
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

export const getTonClient = (): TonClient => {
  const client = new TonClient({
    endpoint: 'https://toncenter.com/api/v2/jsonRPC',
    apiKey: 'e6b78ea1c2663edc4da0feecb62e98e4420223729071f4ff10067517b9b68a09',
  });

  return client;
};
