import { BlockfrostProvider, MeshWallet } from '@meshsdk/core';
import { isLedgerOptions, WalletOptions } from './constants';

const freeBlockfrostKey = 'mainnetGlmedbsdxOKvmiUPnXuf5slw8Wk8VQC5';

export const getCardanoWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    // TODO add ledger support
    throw new Error('Ledger mode is not supported.');
  }

  const { mnemonic, apiKey } = options;

  const blockchainProvider = new BlockfrostProvider(
    apiKey ?? freeBlockfrostKey,
  );

  const wallet = new MeshWallet({
    networkId: 1,
    fetcher: blockchainProvider,
    submitter: blockchainProvider,
    key: {
      type: 'mnemonic',
      words: mnemonic.split(' '),
    },
  });

  return wallet;
};
