<template>
  <div class="WalletDelegates">
    <div
      v-if="!Object.keys(currentVotes).length && isExplanationDisplayed"
      class="WalletDelegates__explanation relative rounded-lg mt-2 mb-6 bg-theme-explanation-background text-theme-explanation-text flex flex-row items-center justify-between"
    >
      <div class="WalletDelegates__explanation__text flex text-left text-inherit py-4 pl-6">
        <span>
          {{ $t('WALLET_DELEGATES.EXPLANATION', { delegates: activeDelegates }) }}
          <a
            :title="$t('WALLET_DELEGATES.BLOG')"
            class="cursor-pointer inline"
            @click="electron_openExternal(votingUrl)"
          >
            {{ $t('WALLET_DELEGATES.BLOG') }}
          </a>
        </span>
      </div>

      <div class="WalletDelegates__explanation__close flex py-4 px-6 z-10">
        <ButtonClose
          class="cursor-pointer select-none"
          @click="dismissExplanation"
        />
      </div>
    </div>

    <TableWrapper
      :columns="columns"
      :is-loading="isLoading"
      :is-remote="true"
      :rows="shownDelegates"
      :sort-query="{
        field: queryParams.sort.field,
        type: queryParams.sort.type
      }"
      :total-rows="totalCount"
      :no-data-message="$t('TABLE.NO_DELEGATES')"
      class="WalletDelegates__table"
      @on-sort-change="onSortChange"
      @on-row-click="onRowClick"
    >
      <template
        slot-scope="data"
      >
        <div
          v-if="data.column.field === 'username'"
        >
          <div class="flex items-center">
            <div style="width: 250px">{{ data.formattedRow['username'] }}</div>
            <span
              v-if="Object.keys(currentVotes).includes(data.row.username)"
              class="vote-badge"
            >
              {{ `${$t('WALLET_DELEGATES.VOTE')} ${formatPercentage(data.row.votePercent)}%` }}
            </span>
          </div>
        </div>

        <span
          v-else-if="data.column.field === 'newVotePercent'"
        >
          <InputPercentage
            :ref="'percentageInput-' + data.row.username"
            :value="data.row.newVotePercent"
            :helper-text="formatter_networkCurrency(data.row.voteBalance)"
            @percent-input="(value) => emitNewPercentage(value, data.formattedRow['username'])"
          />
        </span>

        <span v-else>
          {{ data.formattedRow[data.column.field] }}
        </span>
      </template>
    </TableWrapper>
  </div>
</template>

<script>
import { isEqual } from "lodash";
import { ButtonClose } from "@/components/Button";
import TableWrapper from "@/components/utils/TableWrapper";
import InputPercentage from "@/components/Input/InputPercentage.vue";

export default {
    name: "WalletDelegates",

    inject: ["walletVotes", "newVotes", "delegateSearch"],

    components: {
        ButtonClose,
        TableWrapper,
        InputPercentage
    },

    data () {
        return {
            currentPage: 1,
            delegates: [],
            shownDelegates: [],
            isExplanationTruncated: true,
            isLoading: false,
            totalCount: 0,
            queryParams: {
                sort: {
                    field: "rank",
                    type: "asc"
                }
            }
        };
    },

    computed: {
        currentVotes () {
            return this.walletVotes();
        },
        newVotesProp () {
            return this.newVotes();
        },
        filterSearch () {
            return this.delegateSearch();
        },

        activeDelegates () {
            return this.session_network.constants.activeDelegates || 53;
        },

        columns () {
            return [
                {
                    label: this.$t("WALLET_DELEGATES.RANK"),
                    field: "rank",
                    type: "number",
                    thClass: "text-center",
                    tdClass: "text-center"
                },
                {
                    label: this.$t("WALLET_DELEGATES.USERNAME"),
                    field: "username",
                    tdClass: "w-7/8"
                },
                {
                    label: this.$t("WALLET_DELEGATES.APPROVAL"),
                    field: "newVotePercent",
                    type: "percentage",
                    tdClass: "w-8"
                }
            ];
        },

        currentWallet () {
            return this.wallet_fromRoute;
        },

        isExplanationDisplayed () {
            return this.$store.getters["app/showVotingExplanation"];
        },

        votingUrl () {
            return "https://docs.solar.org/desktop-wallet/introduction-to-solar-rewards";
        }
    },

    watch: {
        currentVotes () {
            this.fetchDelegates();
        },
        filterSearch () {
            this.filter();
        },
        newVotesProp () {
            this.delegates = this.delegates.map(delegate => {
                delegate.newVotePercent = this.newVotesProp[delegate.username] || 0;
                delegate.voteBalance = Math.trunc((this.currentWallet.balance * delegate.newVotePercent) / 10000);
                return delegate;
            });
            this.filter();
        }
    },

    mounted () {
        this.fetchDelegates();
    },

    methods: {
        dismissExplanation () {
            this.$store.dispatch("app/setVotingExplanation", false);
        },

        emitNewPercentage (value, delegate) {
            this.$emit("on-delegate-percentage-change", value, delegate);
        },

        async fetchDelegates () {
            if (this.isLoading) {
                return;
            }

            try {
                this.isLoading = true;

                const walletVotes = this.currentVotes;

                const allDelegates = [];
                let page = 1;
                let apiDelegates;
                while ((apiDelegates = (await this.$client.fetchDelegates({
                    page,
                    limit: 100
                })).delegates).length > 0) {
                    for (const delegate of apiDelegates) {
                        allDelegates.push(delegate);
                    }
                    page++;
                }
                this.delegates = allDelegates.map(delegate => {
                    delegate.votePercent = walletVotes[delegate.username] || 0;
                    delegate.newVotePercent = this.newVotesProp[delegate.username] || 0;
                    delegate.voteBalance = Math.trunc((this.currentWallet.balance * delegate.newVotePercent) / 10000);
                    return delegate;
                }).filter((del) => del.rank !== undefined);
                this.filter();
            } catch (error) {
                this.$logger.error(error);
                this.$error(this.$t("COMMON.FAILED_FETCH", {
                    name: "delegates",
                    msg: error.message
                }));
                this.delegates = [];
                this.filter();
            } finally {
                this.isLoading = false;
            }
        },

        formatPercentage (value) {
            return value / 100;
        },

        onSortChange (sortOptions) {
            const params = sortOptions[0];

            if (!isEqual(params, this.queryParams.sort)) {
                this.__updateParams({
                    sort: params
                });
                this.delegates = this.delegates.slice().sort((a, b) => {
                    const asc = this.queryParams.sort.type === "asc";
                    const field = this.queryParams.sort.field;
                    if (a[field] < b[field]) return -1 * (asc ? 1 : -1);
                    else if (a[field] > b[field]) return 1 * (asc ? 1 : -1);
                    return 0;
                });
                this.filter();
            }
        },

        onRowClick ({ row }) {
            this.$refs["percentageInput-" + row.username].focus();
        },

        filter () {
            this.shownDelegates = this.delegates.filter((del) => !this.filterSearch || del.username.includes(this.filterSearch));
            this.totalCount = this.shownDelegates.length;
        },

        reset () {
            this.currentPage = 1;
            this.queryParams.page = 1;
            this.totalCount = 0;
            this.delegates = [];
        },

        __updateParams (newProps) {
            this.queryParams = Object.assign({}, this.queryParams, newProps);
        }
    }
};
</script>

<style scoped>
.WalletDelegates__explanation__close {
  top: 0;
  margin-bottom: auto;
  margin-top: 5px;
}

</style>

<style>
.WalletDelegates .ButtonClose__cross {
  color: var(--theme-explanation-text)
}
</style>
