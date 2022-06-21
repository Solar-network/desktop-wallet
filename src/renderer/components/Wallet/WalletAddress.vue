<template>
  <span class="WalletAddress flex items-center">
    <span
      v-if="transaction_isSecondSignature(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.SECOND_SIGNATURE'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.SECOND_SIGNATURE") }}
    </span>
    <span
      v-else-if="transaction_isDelegateRegistration(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.DELEGATE_REGISTRATION'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.DELEGATE_REGISTRATION") }}
    </span>
    <div
      v-else-if="transaction_isVote(type, group)"
    >
      <a
        v-if="!isUnvote && countVotes === 1"
        v-tooltip="{
          content: votedDelegateAddress,
          container: tooltipContainer,
          delay: { show: 300, hide: 0 },
          show: showTooltip,
          trigger: 'manual'
        }"
        class="text-green"
        @click.stop="onClick"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
      >
        {{ $t("TRANSACTION.TYPE.VOTE") }}
        <span
          v-if="votedDelegate"
          class="italic"
        >
          ({{ votedDelegateUsername }})
        </span>
      </a>
      <span
        v-else-if="!isUnvote"
        class="text-green"
      >
        {{ $t("TRANSACTION.TYPE.VOTE") }} ({{ countVotes }} Delegates)
      </span>
      <span
        v-else
        class="text-red"
      >
        {{ $t("TRANSACTION.TYPE.UNVOTE") }}
      </span>
    </div>
    <div
      v-else-if="transaction_isLegacyVote(type, group)"
    >
      <a
        v-if="!isLegacyUnvote"
        v-tooltip="{
          content: votedDelegateAddress,
          container: tooltipContainer,
          delay: { show: 300, hide: 0 },
          show: showTooltip,
          trigger: 'manual'
        }"
        class="text-green"
        @click.stop="onClick"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
      >
        {{ $t("TRANSACTION.TYPE.VOTE") }}
        <span
          v-if="votedDelegate"
          class="italic"
        >
          ({{ votedDelegateUsername }})
        </span>
      </a>
      <span
        v-else
        class="text-red"
      >
        {{ $t("TRANSACTION.TYPE.UNVOTE") }}
      </span>
    </div>
    <span
      v-else-if="transaction_isMultiSignature(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.MULTI_SIGNATURE'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.MULTI_SIGNATURE") }}
    </span>
    <span
      v-else-if="transaction_isIpfs(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.IPFS'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.IPFS") }}
    </span>
    <span
      v-else-if="transaction_isMultiPayment(type, group) && countTransfers > 1"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.MULTI_PAYMENT'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ transferRecipientText }}
    </span>
    <span
      v-else-if="transaction_isDelegateResignation(type, group)"
      v-tooltip="{
        content: resignationType,
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ resignationType }}
    </span>
    <span
      v-else-if="transaction_isTimelock(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.HTLC_LOCK'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.HTLC_LOCK") }}
    </span>
    <span
      v-else-if="transaction_isTimelockClaim(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.HTLC_CLAIM'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.HTLC_CLAIM") }}
    </span>
    <span
      v-else-if="transaction_isTimelockRefund(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.HTLC_REFUND'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.HTLC_REFUND") }}
    </span>
    <span
      v-else-if="transaction_isMultiPayment(type, group) && countTransfers === 1"
      v-tooltip="{
        content: transferRecipientText,
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
    >
      <a
        @click.stop="onClick"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
      >
        <slot>
          {{ wallet_formatAddress(transferRecipientText, addressLength) }}
        </slot>
      </a>
    </span>
    <span
      v-else
      v-tooltip="{
        content: address,
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
    >
      <a
        @click.stop="onClick"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
      >
        <slot>
          {{ wallet_formatAddress(address, addressLength) }}
        </slot>
      </a>
    </span>

    <SvgIcon
      v-if="isKnownWallet()"
      v-tooltip="{ content: verifiedAddressText, trigger: 'hover' }"
      name="verified-address"
      view-box="0 0 14 14"
      class="ml-2 text-blue"
    />
  </span>
</template>

<script>
import SvgIcon from "@/components/SvgIcon";

export default {
    name: "WalletAddress",

    components: {
        SvgIcon
    },

    props: {
        address: {
            type: String,
            required: false,
            default: () => ""
        },
        asset: {
            type: Object,
            required: false,
            default: () => {}
        },
        type: {
            type: Number,
            required: false,
            default: () => 0
        },
        group: {
            type: Number,
            required: false,
            default: () => 1
        },
        tooltipContainer: {
            type: String,
            required: false,
            default: () => "#app"
        },
        addressLength: {
            type: Number,
            required: false,
            default: 10
        }
    },

    data: () => ({
        showTooltip: false
    }),

    computed: {
        countVotes () {
            return Object.keys(this.asset.votes).length;
        },

        hasMultipleVotes () {
            return this.asset && this.asset.votes && this.asset.votes.length > 1;
        },

        countTransfers () {
            return (this.asset.payments ? this.asset.payments : this.asset.transfers).length;
        },

        transferRecipientText () {
            if (this.asset && ((this.asset.payments && this.asset.payments.length === 1) || (this.asset.transfers && this.asset.transfers.length === 1))) {
                return this.asset.payments ? this.asset.payments[0].recipientId : this.asset.transfers[0].recipientId;
            }

            return this.$t("TRANSACTION.TYPE.MULTI_PAYMENT") + " (" + this.countTransfers + ")";
        },

        isLegacyUnvote () {
            return this.asset && this.asset.votes && this.asset.votes[this.asset.votes.length - 1].charAt(0) === "-";
        },

        isUnvote () {
            return this.asset && this.asset.votes && Object.keys(this.asset.votes).length === 0;
        },

        resignationType () {
            if (this.asset && this.asset.resignationType) {
                switch (this.asset.resignationType) {
                case 1:
                    return this.$t("TRANSACTION.DELEGATE_RESIGNATION.PERMANENT");
                case 2:
                    return this.$t("TRANSACTION.DELEGATE_RESIGNATION.REVOKE");
                default:
                    return this.$t("TRANSACTION.DELEGATE_RESIGNATION.TEMPORARY");
                }
            } else {
                return this.$t("TRANSACTION.DELEGATE_RESIGNATION.TEMPORARY");
            }
        },

        votePublicKeyOrUsername () {
            if (this.asset && this.asset.votes) {
                if (!Array.isArray(this.asset.votes)) {
                    return Object.keys(this.asset.votes)[0];
                } else {
                    const vote = this.hasMultipleVotes ? this.asset.votes.find(vote => vote.charAt(0) === "+") : this.asset.votes[0];
                    return vote.substr(1);
                }
            }
            return "";
        },

        votedDelegate () {
            if (this.votePublicKeyOrUsername) {
                if (this.votePublicKeyOrUsername.length === 66) {
                    return this.$store.getters["delegate/byPublicKey"](this.votePublicKeyOrUsername);
                } else {
                    return this.$store.getters["delegate/byUsername"](this.votePublicKeyOrUsername);
                }
            }

            return null;
        },

        votedDelegateUsername () {
            return this.votedDelegate ? this.votedDelegate.username : "";
        },

        votedDelegateAddress () {
            return this.votedDelegate ? this.votedDelegate.address : "";
        },

        verifiedAddressText () {
            let verifiedText = "";
            const knownWallet = this.isKnownWallet();
            if (knownWallet && knownWallet !== this.wallet_formatAddress(this.address, this.addressLength)) {
                verifiedText = `${knownWallet} - `;
            }

            return verifiedText + this.$t("COMMON.VERIFIED_ADDRESS");
        }
    },

    methods: {
        isKnownWallet () {
            return this.session_network.knownWallets[this.address];
        },

        onClick () {
            this.showTooltip = false;
            this.$emit("click");
            this.openAddress();
        },

        onMouseOver () {
            this.showTooltip = true;
        },

        onMouseOut () {
            this.showTooltip = false;
        },

        openAddress () {
            if (this.votePublicKeyOrUsername) {
                this.$router.push({ name: "wallet-show", params: { address: this.votedDelegateAddress } });
            } else {
                let address = this.address;
                if (!address) {
                    address = this.transferRecipientText;
                }
                this.$router.push({ name: "wallet-show", params: { address } });
            }
        }
    }
};
</script>

<style lang="postcss" scoped>
.WalletAddress > span {
  @apply .truncate;
  padding-right: 1px;
}

.WalletAddress a {
  @apply cursor-pointer
}
</style>
