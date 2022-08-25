<template>
  <ModalWindow
    :title="$t('TRANSACTION.TRANSACTION')"
    container-classes="TransactionShow"
    @close="emitClose"
  >
    <ListDivided>
      <ListDividedItem
        :label="$t('TRANSACTION.ID')"
        item-value-class="flex items-center"
      >
        <span
          v-tooltip="{
            content: transaction.id,
            trigger: 'hover',
            classes: 'text-xs'
          }"
          class="cursor-default"
        >
          {{ transaction.id | truncateMiddle(30) }}
        </span>
        <ButtonClipboard
          :value="transaction.id"
          :class="{ 'mr-2': transaction.confirmations }"
          class="text-theme-page-text-light ml-2"
        />
        <button
          v-if="transaction.confirmations"
          v-tooltip="{
            content: `${$t('TRANSACTION.OPEN_IN_EXPLORER')}`,
            trigger: 'hover'
          }"
          class="flex items-center"
          @click="openTransaction"
        >
          <SvgIcon
            name="open-external"
            view-box="0 0 12 12"
            class="text-theme-page-text-light"
          />
        </button>
      </ListDividedItem>

      <ListDividedItem
        v-if="transaction.blockId"
        :label="$t('TRANSACTION.BLOCK_ID')"
        item-value-class="flex items-center"
      >
        <span
          v-tooltip="{
            content: transaction.blockId,
            trigger: 'hover',
            classes: 'text-xs'
          }"
          class="cursor-default"
        >
          {{ transaction.blockId | truncateMiddle(30) }}
        </span>
        <ButtonClipboard
          :value="transaction.blockId"
          class="text-theme-page-text-light mx-2"
        />
        <button
          v-tooltip="{
            content: `${$t('TRANSACTION.OPEN_IN_EXPLORER')}`,
            trigger: 'hover'
          }"
          class="flex items-center"
          @click="openBlock"
        >
          <SvgIcon
            name="open-external"
            view-box="0 0 12 12"
            class="text-theme-page-text-light"
          />
        </button>
      </ListDividedItem>

      <ListDividedItem
        class="TransactionShow__Sender"
        :label="$t('TRANSACTION.SENDER')"
        item-value-class="flex items-center"
      >
        <WalletAddress
          :address="transaction.sender"
          @click="emitClose"
        />
        <ButtonClipboard
          :value="transaction.sender"
          class="text-theme-page-text-light mx-2"
        />
        <button
          v-tooltip="{
            content: `${$t('TRANSACTION.OPEN_IN_EXPLORER')}`,
            trigger: 'hover'
          }"
          class="flex items-center"
          @click="openAddress(transaction.sender)"
        >
          <SvgIcon
            name="open-external"
            view-box="0 0 12 12"
            class="text-theme-page-text-light"
          />
        </button>
      </ListDividedItem>

      <ListDividedItem
        v-if="showRecipient"
        class="TransactionShow__Recipient"
        :label="$t('TRANSACTION.RECIPIENT')"
        item-value-class="flex items-center"
      >
        <WalletAddress
          :address="showRecipient"
          @click="emitClose"
        />
        <ButtonClipboard
          class="text-theme-page-text-light mx-2"
          :value="votedDelegate ? votedDelegate.address : transaction.recipient"
        />
        <button
          v-tooltip="{
            content: `${$t('TRANSACTION.OPEN_IN_EXPLORER')}`,
            trigger: 'hover'
          }"
          class="flex items-center"
          @click="openAddress(votedDelegate ? votedDelegate.address : transaction.recipient)"
        >
          <SvgIcon
            name="open-external"
            view-box="0 0 12 12"
            class="text-theme-page-text-light"
          />
        </button>
      </ListDividedItem>

      <ListDividedItem
        :label="$t('TRANSACTION.AMOUNT')"
        item-value-class="flex items-center"
      >
        <TransactionAmount :transaction="transaction" />
        <TransactionStatusIcon
          v-bind="transaction"
          :show-waiting-confirmations="false"
          class="ml-2"
        />

        <SvgIcon
          v-if="!!amountTooltip"
          v-tooltip="amountTooltip"
          name="exclamation-mark"
          view-box="0 0 16 20"
          class="ml-2 text-theme-page-text-light"
        />
      </ListDividedItem>

      <ListDividedItem
        :label="$t('TRANSACTION.FEE')"
        :value="formatter_networkCurrency(transaction.fee)"
      />

      <ListDividedItem
        v-if="transaction.nonce"
        :label="$t('TRANSACTION.NONCE')"
        :value="transaction.nonce"
      />

      <ListDividedItem
        :label="$t('TRANSACTION.CONFIRMATIONS')"
        item-value-class="flex items-center"
      >
        <span v-if="transaction.isExpired">
          {{ $t('TRANSACTION.EXPIRED') }}
        </span>
        <span v-else-if="!isWellConfirmed">
          {{ transaction.confirmations }}
        </span>
        <span v-else>
          {{ $t('TRANSACTION.WELL_CONFIRMED') }}
        </span>

        <span
          v-show="!transaction.isExpired"
          v-tooltip="{
            content: $t('TRANSACTION.CONFIRMATION_COUNT', { confirmations: transaction.confirmations }),
            trigger: 'hover'
          }"
          class="flex items-center ml-2"
        >
          <SvgIcon
            name="time"
            view-box="0 0 12 13"
          />
        </span>
      </ListDividedItem>

      <ListDividedItem
        v-if="!!multiSignatureWalletAddress"
        :value="multiSignatureWalletAddress"
        :label="$t('TRANSACTION.MULTI_SIGNATURE.ADDRESS')"
      />

      <ListDividedItem
        :label="$t('TRANSACTION.TIMESTAMP')"
        :value="formatter_date(transaction.timestamp)"
      />

      <ListDividedItem
        v-if="transaction.memo"
        :value="transaction.memo"
        :label="$t('TRANSACTION.VENDOR_FIELD')"
        item-label-class="mb-auto"
        item-value-class="max-w-xs break-words text-justify"
      />

      <ListDividedItem
        v-if="isVote && countVotes > 0"
        class="TransactionShow__Recipients"
        :label="$t('TRANSACTION.VOTES')"
        item-value-class="items-center"
      >
        <TransactionVotesList
          :title="null"
          :items="getVotes"
          :show-links="true"
          readonly
          @click="emitClose"
        />
      </ListDividedItem>

      <ListDividedItem
        v-if="isMultiPayment && ((transaction.asset.payments && transaction.asset.payments.length > 1) || (transaction.asset.transfers && transaction.asset.transfers.length > 1))"
        class="TransactionShow__Recipients"
        :label="$t('TRANSACTION.RECIPIENTS')"
        item-value-class="items-center"
      >
        <TransactionRecipientList
          :title="null"
          :items="transaction.asset.payments || transaction.asset.transfers"
          :show-links="true"
          readonly
          @click="emitClose"
        />
      </ListDividedItem>
    </ListDivided>

    <div v-show="transaction.isExpired">
      <ButtonGeneric
        :label="$t('TRANSACTION.RESEND')"
        @click="emitResend"
      />
      <ButtonGeneric
        :label="$t('TRANSACTION.DISCARD')"
        class="ml-4"
        @click="emitDiscard"
      />
    </div>
  </ModalWindow>
</template>

<script>
import { at } from "lodash";
import { TRANSACTION_GROUPS, TRANSACTION_TYPES } from "@config";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import { ModalWindow } from "@/components/Modal";
import { ButtonClipboard, ButtonGeneric } from "@/components/Button";
import SvgIcon from "@/components/SvgIcon";
import { TransactionAmount, TransactionRecipientList, TransactionStatusIcon, TransactionVotesList } from "@/components/Transaction";
import WalletAddress from "@/components/Wallet/WalletAddress";
import WalletService from "@/services/wallet";
import truncateMiddle from "@/filters/truncate-middle";

export default {
    name: "TransactionShow",

    components: {
        ButtonGeneric,
        ListDivided,
        ListDividedItem,
        ModalWindow,
        ButtonClipboard,
        SvgIcon,
        TransactionAmount,
        TransactionRecipientList,
        TransactionStatusIcon,
        TransactionVotesList,
        WalletAddress
    },

    props: {
        transaction: {
            type: Object,
            required: true
        }
    },

    data: () => ({
        votedDelegate: null
    }),

    computed: {
        countVotes () {
            if (!Array.isArray(this.transaction.asset.votes)) {
                return Object.keys(this.transaction.asset.votes).length;
            }
            return this.transaction.asset.votes.filter(vote => vote.charAt(0) === "+").length;
        },
        getVotes () {
            if (!Array.isArray(this.transaction.asset.votes)) {
                return Object.entries(this.transaction.asset.votes).map(vote => ({ address: this.$store.getters["delegate/byUsername"](vote[0]).address, delegate: vote[0], percent: vote[1] }));
            }
            const delegate = this.transaction.asset.votes.filter(vote => vote.charAt(0) === "+")[0].slice(1);
            return [{ address: this.$store.getters["delegate/byUsername"](delegate).address, delegate, percent: 100 }];
        },
        isWellConfirmed () {
            return this.transaction.confirmations >= (this.numberOfActiveDelegates || 51);
        },
        isMultiPayment () {
            return this.transaction.asset && (this.transaction.asset.payments || this.transaction.asset.transfers);
        },
        isVote () {
            return this.transaction.asset && this.transaction.asset.votes;
        },
        numberOfActiveDelegates () {
            return at(this, "session_network.constants.activeDelegates") || 51;
        },
        votePublicKeyOrUsername () {
            const transaction = this.getTransaction();
            if (transaction && transaction.asset && transaction.asset.votes) {
                if (!Array.isArray(transaction.asset.votes)) {
                    return Object.keys(transaction.asset.votes)[0];
                }

                const vote = transaction.asset.votes[0];
                return vote.substr(1);
            }
            return "";
        },

        multiSignatureWalletAddress () {
            const transaction = this.getTransaction();
            if (!transaction.asset || !transaction.asset.multiSignature) {
                return null;
            }

            return WalletService.getAddressFromMultiSignatureAsset(transaction.asset.multiSignature);
        },

        showRecipient () {
            if (this.transaction.asset && (this.transaction.asset.payments || this.transaction.asset.transfers)) {
                if (this.transaction.asset.payments && this.transaction.asset.payments.length === 1) {
                    return this.transaction.asset.payments[0].recipientId;
                }

                if (this.transaction.asset.transfers && this.transaction.asset.transfers.length === 1) {
                    return this.transaction.asset.transfers[0].recipientId;
                }
                return false;
            }

            return this.transaction.recipient;
        },

        amountTooltip () {
            const walletAddress = this.transaction.walletAddress || (this.wallet_fromRoute ? this.wallet_fromRoute.address : null);
            if (!walletAddress || this.transaction.sender !== walletAddress) {
                return null;
            } else if (this.transaction.typeGroup === TRANSACTION_GROUPS.MAGISTRATE) {
                return null;
            } else if (this.transaction.type !== TRANSACTION_TYPES.GROUP_1.MULTI_PAYMENT) {
                return null;
            }

            const amount = this.currency_toBuilder(0);
            const payments = this.transaction.asset.payments || this.transaction.asset.transfers;
            for (const payment of payments) {
                if (payment.recipientId !== walletAddress) {
                    continue;
                }

                amount.add(payment.amount);
            }

            if (amount.isEqualTo(0)) {
                return null;
            }

            return this.$t("TRANSACTION.ERROR.MULTI_PAYMENT_TO_SELF", {
                amount: this.formatter_networkCurrency(amount)
            });
        }
    },

    mounted () {
        if (this.votePublicKeyOrUsername) {
            this.determineVote();
        }
    },

    methods: {
        getTransaction () {
            if (this.transaction.raw) {
                return this.transaction.raw;
            }

            return this.transaction;
        },

        openTransaction () {
            this.network_openExplorer("transaction", this.transaction.id);
        },

        openAddress (address) {
            this.network_openExplorer("wallets", address);
        },

        openBlock () {
            this.network_openExplorer("block", this.transaction.blockId);
        },

        emitClose () {
            this.$emit("close", "navigateToTransactions");
        },

        async emitResend () {
            const shouldBroadcast = this.$store.getters["session/broadcastPeers"];
            await this.$client.broadcastTransaction(this.transaction.raw, shouldBroadcast);

            this.$success(this.$t("TRANSACTION.RESENT_NOTICE", { transactionId: truncateMiddle(this.transaction.id) }));
            this.$emit("close");
        },

        emitDiscard () {
            this.$store.dispatch("transaction/delete", this.transaction);
            this.$emit("close");
            this.$eventBus.emit("wallet:reload");
        },

        openAddressInWallet (address) {
            this.$router.push({ name: "wallet-show", params: { address } });
            this.emitClose();
        },

        determineVote () {
            if (this.votePublicKeyOrUsername.length === 66) {
                this.votedDelegate = this.$store.getters["delegate/byPublicKey"](this.votePublicKeyOrUsername);
            } else {
                this.votedDelegate = this.$store.getters["delegate/byUsername"](this.votePublicKeyOrUsername);
            }
        }
    }
};
</script>

<style>
.TransactionShow {
  @apply .overflow-auto;
  min-width: 35rem;
  max-height: 80vh;
}

.TransactionShow__Sender .ListDividedItem__value,
.TransactionShow__Recipient .ListDividedItem__value {
  @apply .max-w-xs;
}
.TransactionShow__Sender .ListDividedItem__value .WalletAddress,
.TransactionShow__Recipient .ListDividedItem__value .WalletAddress {
  @apply .truncate;
}

.TransactionShow__Recipients {
  @apply .pb-0;
}
.TransactionShow__Recipients.ListDividedItem > div {
  @apply .flex-col .items-start;
}
</style>
