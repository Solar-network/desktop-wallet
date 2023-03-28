<template>
  <form
    class="TransactionFormIpfs flex flex-col"
    @submit.prevent
  >
    <template>
      <ListDivided :is-floating-label="true">
        <ListDividedItem
          :label="$t('TRANSACTION.SENDER')"
          item-value-class="w-full"
        >
          <span class="break-words">
            {{ senderLabel }}
          </span>
          <span
            v-if="senderLabel !== currentWallet.address"
            class="text-sm text-theme-page-text-light"
          >
            {{ currentWallet.address }}
          </span>
        </ListDividedItem>
      </ListDivided>

      <InputText
        v-model="$v.form.hash.$model"
        :helper-text="hashError"
        :label="$t('WALLET_IPFS.HASH')"
        :is-invalid="!!hashError"
        class="TransactionFormIpfs__hash mb-5"
        name="hash"
      />

      <InputFee
        ref="fee"
        :currency="walletNetwork.token"
        :transaction-type="$options.transactionType"
        :show-insufficient-funds="true"
        class="TransactionFormIpfs__fee"
        @input="onFee"
      />

      <div v-if="!isMultiSignature">
        <div
          v-if="currentWallet.isLedger"
          class="TransactionFormIpfs__ledger-notice mt-10"
        >
          {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
        </div>

        <InputPassword
          v-else-if="currentWallet.mnemonic"
          ref="password"
          v-model="$v.form.walletPassword.$model"
          :label="$t('TRANSACTION.PASSWORD')"
          :is-required="true"
          class="TransactionFormIpfs__password mt-4"
        />

        <MnemonicInput
          v-else
          ref="mnemonic"
          v-model="$v.form.mnemonic.$model"
          :address="currentWallet.address"
          :pub-key-hash="walletNetwork.version"
          class="TransactionFormIpfs__mnemonic mt-4"
        />
      </div>

      <MnemonicInput
        v-if="currentWallet.secondPublicKey"
        ref="extraMnemonic"
        v-model="$v.form.extraMnemonic.$model"
        :label="$t('TRANSACTION.EXTRA_MNEMONIC')"
        :pub-key-hash="walletNetwork.version"
        :public-key="currentWallet.secondPublicKey"
        class="TransactionFormIpfs__extra-mnemonic mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        class="TransactionFormIpfs__next blue-button mt-10 ml-0"
        @click="onSubmit"
      >
        {{ $t('COMMON.NEXT') }}
      </button>

      <ModalLoader
        ref="modalLoader"
        :message="$t('ENCRYPTION.DECRYPTING')"
        :visible="showEncryptLoader"
      />
      <ModalLoader
        :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
        :visible="showLedgerLoader"
      />
    </template>
  </form>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { InputFee, InputPassword, InputText } from "@/components/Input";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import { ModalLoader } from "@/components/Modal";
import { MnemonicInput } from "@/components/Mnemonic";
import mixin from "./mixin";

export default {
    name: "TransactionFormIpfs",

    transactionType: TRANSACTION_TYPES.GROUP_1.IPFS,

    components: {
        InputFee,
        InputPassword,
        InputText,
        ListDivided,
        ListDividedItem,
        ModalLoader,
        MnemonicInput
    },

    mixins: [mixin],

    data: () => ({
        form: {
            fee: 0,
            hash: "",
            mnemonic: "",
            walletPassword: ""
        }
    }),

    computed: {
        hashError () {
            if (this.$v.form.hash.$dirty && !this.$v.form.hash.isValid) {
                return this.$t("WALLET_IPFS.HASH_ERROR");
            }

            return null;
        }
    },

    methods: {
        getTransactionData () {
            const transactionData = {
                address: this.currentWallet.address,
                hash: this.form.hash,
                mnemonic: this.form.mnemonic,
                fee: this.getFee(),
                wif: this.form.wif,
                networkWif: this.walletNetwork.wif,
                multiSignature: this.currentWallet.multiSignature
            };

            if (this.currentWallet.secondPublicKey) {
                transactionData.extraMnemonic = this.form.extraMnemonic;
            }

            return transactionData;
        },

        async buildTransaction (transactionData, isAdvancedFee = false, returnObject = false) {
            return this.$client.buildIpfs(transactionData, isAdvancedFee, returnObject);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.IPFS"));
        }
    },

    validations: {
        form: {
            fee: mixin.validators.fee,
            mnemonic: mixin.validators.mnemonic,
            walletPassword: mixin.validators.walletPassword,
            extraMnemonic: mixin.validators.extraMnemonic,

            hash: {
                isValid (value) {
                    return /^Qm/.test(value) && value.length >= 2 && value.length <= 90;
                }
            }
        }
    }
};
</script>
