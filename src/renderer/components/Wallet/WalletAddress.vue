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
        v-if="!hasMultipleVotes"
        v-tooltip="{
          content: votedDelegateAddress,
          container: tooltipContainer,
          delay: { show: 300, hide: 0 },
          show: showTooltip,
          trigger: 'manual'
        }"
        :class="[isUnvote ? 'text-red' : 'text-green']"
        @click.stop="onClick"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
      >
        {{ isUnvote ? $t("TRANSACTION.TYPE.UNVOTE") : $t("TRANSACTION.TYPE.VOTE") }}
        <span
          v-if="votedDelegate"
          class="italic"
        >
          ({{ votedDelegateUsername }})
        </span>
      </a>

      <div
        v-else
        class="flex items-center truncate"
        @click.stop="onClick"
        @mouseover="onMouseOver"
        @mouseout="onMouseOut"
      >
        <a
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
        <span class="ml-1">
          / {{ $t("TRANSACTION.TYPE.UNVOTE") }}
        </span>
      </div>
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
      v-else-if="transaction_isMultiPayment(type, group)"
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
      {{ $t("TRANSACTION.TYPE.MULTI_PAYMENT") }}
    </span>
    <span
      v-else-if="transaction_isDelegateResignation(type, group)"
      v-tooltip="{
        content: $t('TRANSACTION.TYPE.DELEGATE_RESIGNATION'),
        container: tooltipContainer,
        delay: { show: 300, hide: 0 },
        show: showTooltip,
        trigger: 'manual'
      }"
      @mouseover="onMouseOver"
      @mouseout="onMouseOut"
    >
      {{ $t("TRANSACTION.TYPE.DELEGATE_RESIGNATION") }}
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
import SvgIcon from '@/components/SvgIcon'

export default {
  name: 'WalletAddress',

  components: {
    SvgIcon
  },

  props: {
    address: {
      type: String,
      required: false,
      default: () => ''
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
      default: () => '#app'
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
    hasMultipleVotes () {
      return this.asset && this.asset.votes && this.asset.votes.length > 1
    },

    isUnvote () {
      return this.asset && this.asset.votes && this.asset.votes[0].charAt(0) === '-'
    },

    votePublicKey () {
      if (this.asset && this.asset.votes) {
        const vote = this.hasMultipleVotes ? this.asset.votes.find(vote => vote.charAt(0) === '+') : this.asset.votes[0]
        return vote.substr(1)
      }
      return ''
    },

    votedDelegate () {
      if (this.votePublicKey) {
        return this.$store.getters['delegate/byPublicKey'](this.votePublicKey)
      }

      return null
    },

    votedDelegateUsername () {
      return this.votedDelegate ? this.votedDelegate.username : ''
    },

    votedDelegateAddress () {
      return this.votedDelegate ? this.votedDelegate.address : ''
    },

    verifiedAddressText () {
      let verifiedText = ''
      const knownWallet = this.isKnownWallet()
      if (knownWallet && knownWallet !== this.wallet_formatAddress(this.address, this.addressLength)) {
        verifiedText = `${knownWallet} - `
      }

      return verifiedText + this.$t('COMMON.VERIFIED_ADDRESS')
    }
  },

  methods: {
    isKnownWallet () {
      return this.session_network.knownWallets[this.address]
    },

    onClick () {
      this.showTooltip = false
      this.$emit('click')
      this.openAddress()
    },

    onMouseOver () {
      this.showTooltip = true
    },

    onMouseOut () {
      this.showTooltip = false
    },

    openAddress () {
      if (this.votePublicKey) {
        this.$router.push({ name: 'wallet-show', params: { address: this.votedDelegateAddress } })
      } else {
        this.$router.push({ name: 'wallet-show', params: { address: this.address } })
      }
    }
  }
}
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
