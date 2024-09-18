import {
  addTxSignatures,
  EVMUnsignedTx,
  secp256k1,
  UnsignedTx,
  utils,
} from '@avalabs/avalanchejs';

import { ethers } from 'ethers';

import {
  LedgerOptions,
  MnemonicWalletOptions,
  WalletOptions,
  isLedgerOptions,
} from './constants';
import { getEthereumWallet } from './ethereum';
import { createHash } from 'crypto';

const sign = async (
  tx: EVMUnsignedTx | UnsignedTx,
  privateKey: string,
): Promise<string> => {
  await addTxSignatures({
    unsignedTx: tx,
    privateKeys: [utils.hexToBuffer(privateKey)],
  });

  return utils.bufferToHex(utils.addChecksum(tx.getSignedTx().toBytes()));
};

const getMnemonicWallet = async (
  options: MnemonicWalletOptions,
): Promise<any> => {
  if (!options.mnemonic) {
    return null;
  }

  // @ts-expect-error
  const wallet: ethers.Wallet | null = await getEthereumWallet(options);
  if (!wallet) {
    return null;
  }

  const privateKeyBuffer = utils.hexToBuffer(wallet.privateKey);

  // Generate the public key from the private key using secp256k1
  const publicKeyBuffer = secp256k1.getPublicKey(privateKeyBuffer);

  const sha256Hash = createHash('sha256').update(publicKeyBuffer).digest();
  const ripemd160Hash = createHash('ripemd160').update(sha256Hash).digest();

  return {
    ethereumAddress: await wallet.getAddress(),
    sign: async (tx: EVMUnsignedTx | UnsignedTx) => sign(tx, wallet.privateKey),
    getEthereumAddress: () => wallet.getAddress(),
    getCAddressString: () => utils.format('C', 'avax', ripemd160Hash),
    getPAddressString: () => utils.format('P', 'avax', ripemd160Hash),
  };
};

export const getAvalancheWallet = (options: WalletOptions | LedgerOptions) => {
  if (isLedgerOptions(options)) {
    // TODO add ledger support
    throw new Error('Ledger mode is not supported.');
  }

  return getMnemonicWallet(options);
};
