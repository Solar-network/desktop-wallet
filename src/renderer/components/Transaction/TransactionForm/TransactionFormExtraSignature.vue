<template>
  <form
    class="TransactionFormExtraSignature"
    @submit.prevent
  >
    <template v-if="!currentWallet.secondPublicKey">
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

      <div
        v-if="!showMnemonicWords"
        class="flex content-center"
      >
        <ButtonReload
          :is-refreshing="isGenerating"
          :text="$t('WALLET_EXTRA_SIGNATURE.NEW')"
          color-class="blue-button"
          class="px-8 py-4 mx-auto mt-5"
          @click="displayMnemonicWords"
        />
      </div>

      <Collapse
        :is-open="!isMnemonicStep"
        :animation-duration="{ enter: 0, leave: 0 }"
        class="TransactionFormExtraSignature__step-1"
      >
        <MnemonicWords
          v-show="showMnemonicWords"
          :mnemonic-words="mnemonicWords"
          class="TransactionFormExtraSignature__mnemonic-words"
        />

        <button
          :disabled="isGenerating || !showMnemonicWords"
          :class="{ 'hidden': !showMnemonicWords }"
          type="button"
          class="TransactionFormExtraSignature__step-1__next blue-button mt-5"
          @click="toggleStep"
        >
          {{ $t('COMMON.NEXT') }}
        </button>
      </Collapse>

      <Collapse
        :is-open="isMnemonicStep"
        class="TransactionFormExtraSignature__step-2"
      >
        <MnemonicVerification
          ref="mnemonicVerification"
          :mnemonic="mnemonicWords"
          :word-positions="wordPositions"
          class="TransactionFormExtraSignature__mnemonic-verification mb-10"
          @verified="onVerification"
        />

        <InputFee
          ref="fee"
          :currency="walletNetwork.token"
          :transaction-type="$options.transactionType"
          :show-insufficient-funds="true"
          class="TransactionFormExtraSignature__fee"
          @input="onFee"
        />

        <div v-if="!isMultiSignature">
          <div
            v-if="currentWallet.isLedger"
            class="TransactionFormExtraSignature__ledger-notice mt-10"
          >
            {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
          </div>

          <InputPassword
            v-else-if="currentWallet.mnemonic"
            ref="password"
            v-model="$v.form.walletPassword.$model"
            :label="$t('TRANSACTION.PASSWORD')"
            :is-required="true"
            class="TransactionFormExtraSignature__password mt-4"
          />

          <MnemonicInput
            v-else
            ref="mnemonic"
            v-model="$v.form.mnemonic.$model"
            :address="currentWallet.address"
            :pub-key-hash="walletNetwork.version"
            class="TransactionFormExtraSignature__mnemonic mt-4"
          />
        </div>

        <button
          type="button"
          class="TransactionFormExtraSignature__back blue-button mt-5 mr-4"
          @click="toggleStep"
        >
          {{ $t('COMMON.BACK') }}
        </button>

        <button
          :disabled="$v.form.$invalid || !isMnemonicVerified"
          type="button"
          class="TransactionFormExtraSignature__step-2__next blue-button mt-5"
          @click="onSubmit"
        >
          {{ $t('COMMON.NEXT') }}
        </button>
      </Collapse>

      <ModalLoader
        ref="modalLoader"
        :message="$t('ENCRYPTION.DECRYPTING')"
        :visible="showEncryptLoader"
      />
      <ModalLoader
        :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
        :visible="showLedgerLoader"
      />

      <Portal
        v-if="!isMnemonicStep && showMnemonicWords"
        to="transaction-footer"
      >
        <footer class="TransactionFormExtraSignature__footer ModalWindow__container__footer--warning">
          <div class="flex w-80">
            {{ $t('WALLET_EXTRA_SIGNATURE.INSTRUCTIONS') }}
          </div>
          <div class="flex flex-row justify-around ml-8">
            <ButtonReload
              :is-refreshing="isGenerating"
              :title="$t('WALLET_EXTRA_SIGNATURE.NEW')"
              class="bg-theme-modal-footer-button mr-2"
              text-class="text-theme-modal-footer-button-text"
              @click="generateNewMnemonic"
            />

            <ButtonClipboard
              :value="extraMnemonic"
              class="flex py-2 px-4 rounded bg-theme-modal-footer-button text-theme-modal-footer-button-text"
            />
          </div>
        </footer>
      </Portal>
    </template>
    <template v-else>
      {{ $t('WALLET_EXTRA_SIGNATURE.ALREADY_REGISTERED') }}
    </template>
  </form>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { ButtonClipboard, ButtonReload } from "@/components/Button";
import { Collapse } from "@/components/Collapse";
import { InputFee, InputPassword } from "@/components/Input";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import { ModalLoader } from "@/components/Modal";
import { MnemonicInput, MnemonicVerification, MnemonicWords } from "@/components/Mnemonic";
import WalletService from "@/services/wallet";
import mixin from "./mixin";

export default {
    name: "TransactionFormExtraSignature",

    transactionType: TRANSACTION_TYPES.GROUP_1.EXTRA_SIGNATURE,

    components: {
        ButtonClipboard,
        ButtonReload,
        Collapse,
        InputFee,
        InputPassword,
        ListDivided,
        ListDividedItem,
        ModalLoader,
        MnemonicInput,
        MnemonicVerification,
        MnemonicWords
    },

    mixins: [mixin],

    data: () => ({
        isGenerating: false,
        isMnemonicStep: false,
        isMnemonicVerified: false,
        extraMnemonic: "",
        form: {
            fee: 0,
            mnemonic: "",
            walletPassword: ""
        },
        showMnemonicWords: false
    }),

    computed: {
    // TODO: doesn't need to be computed
        wordPositions () {
            return [3, 6, 9];
        },

        mnemonicWords () {
            // Check for Japanese "space"
            if (/\u3000/.test(this.extraMnemonic)) {
                return this.extraMnemonic.split("\u3000");
            }

            return this.extraMnemonic.split(" ");
        }
    },

    watch: {
        isMnemonicStep () {
            if (this.isMnemonicStep) {
                this.$refs.mnemonicVerification.focusFirst();
            }
        }
    },

    created () {
        this.extraMnemonic = WalletService.generateExtraMnemonic(this.session_profile.bip39Language);
    },

    methods: {
        getTransactionData () {
            return {
                address: this.currentWallet.address,
                mnemonic: this.form.mnemonic,
                extraMnemonic: this.extraMnemonic,
                fee: this.getFee(),
                wif: this.form.wif,
                networkWif: this.walletNetwork.wif,
                multiSignature: this.currentWallet.multiSignature
            };
        },

        async buildTransaction (transactionData, isAdvancedFee = false, returnObject = false) {
            return this.$client.buildExtraSignatureRegistration(transactionData, isAdvancedFee, returnObject);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.EXTRA_SIGNATURE"));
        },

        postSubmit () {
            this.reset();

            // The current mnemonic has been already verified
            this.isMnemonicVerified = true;
        },

        toggleStep () {
            this.isMnemonicStep = !this.isMnemonicStep;
        },

        // TODO: must be a better way of doing this without a timeout?
        displayMnemonicWords () {
            this.isGenerating = true;
            setTimeout(() => {
                this.isGenerating = false;
                this.showMnemonicWords = true;
            }, 300);
        },

        // TODO: must be a better way of doing this without a timeout?
        generateNewMnemonic () {
            this.reset();
            this.isGenerating = true;
            setTimeout(() => {
                this.extraMnemonic = WalletService.generateExtraMnemonic(this.session_profile.bip39Language);
                this.isGenerating = false;
            }, 300);
        },

        onVerification () {
            this.isMnemonicVerified = true;
        },

        reset () {
            this.isMnemonicStep = false;
            this.isMnemonicVerified = false;
            if (!this.isMultiSignature) {
                if (!this.currentWallet.mnemonic && !this.currentWallet.isLedger) {
                    this.$set(this.form, "mnemonic", "");
                    this.$refs.mnemonic.reset();
                } else if (!this.currentWallet.isLedger) {
                    this.$set(this.form, "walletPassword", "");
                    this.$refs.password.reset();
                }
            }
            this.$v.$reset();
        }
    },

    validations: {
        form: {
            fee: mixin.validators.fee,
            mnemonic: mixin.validators.mnemonic,
            walletPassword: mixin.validators.walletPassword
        }
    }
};
</script>

<style scoped>
.TransactionFormExtraSignature {
  min-width: 25em;
}

.TransactionFormExtraSignature /deep/ .Collapse__handler {
  display: none
}

.TransactionFormExtraSignature__footer {
  @apply .flex .flex-row .justify-between;
}
</style>
