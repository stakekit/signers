import { KeyPair, mnemonicToWalletKey, sign } from '@ton/crypto';
import {
  beginCell,
  Cell,
  loadMessageRelaxed,
  SendMode,
  storeMessageRelaxed,
  WalletContractV4,
} from '@ton/ton';
import { isLedgerOptions, WalletOptions } from './constants';

export const getTonWallet = async (options: WalletOptions) => {
  if (isLedgerOptions(options)) {
    // TODO add ledger support
    throw new Error('Ledger mode is not supported.');
  }

  const { mnemonic } = options;
  const keypair = await mnemonicToWalletKey(mnemonic.split(' '));

  const wallet = WalletContractV4.create({
    publicKey: keypair.publicKey,
    workchain: 0,
  });

  return {
    wallet,
    keypair,
  };
};

export const buildSignedMessageFromRaw = (
  raw: string,
  wallet: WalletContractV4,
  keypair: KeyPair,
) => {
  const parsed = JSON.parse(raw) as {
    message: string;
    seqno: number;
  };

  const deserialized: Cell = Cell.fromBoc(
    Buffer.from(parsed.message, 'base64'),
  )[0];
  const loadedMessage = loadMessageRelaxed(deserialized.asSlice());

  const message = beginCell().storeUint(wallet.walletId, 32);
  if (parsed.seqno === 0) {
    for (let i = 0; i < 32; i++) {
      message.storeBit(1);
    }
  } else {
    message.storeUint(Math.floor(Date.now() / 1e3) + 300, 32); // Default timeout: 10 minutes
  }
  message.storeUint(parsed.seqno, 32);
  message.storeUint(0, 8); // Simple order
  message.storeUint(SendMode.PAY_GAS_SEPARATELY, 8);
  message.storeRef(beginCell().store(storeMessageRelaxed(loadedMessage)));

  const signature = sign(message.endCell().hash(), keypair.secretKey);

  const signedMessage = beginCell()
    .storeBuffer(signature)
    .storeBuilder(message)
    .endCell();

  return signedMessage.toBoc().toString('base64');
};
