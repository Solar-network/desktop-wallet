import { reqwest } from "@/utils/http";

export default {
    namespaced: true,

    state: {
        memo: {
            ids: [],
            addresses: []
        }
    },

    getters: {
        byAddress: (state) => {
            return state.memo.addresses;
        },
        byId: (state) => {
            return state.memo.ids;
        }
    },

    mutations: {
        SAVE_HIDDEN (state, memo) {
            state.memo = memo;
        }
    },

    actions: {
        async fetch ({ commit }) {
            try {
                // Third party resource of confirmed reports from the community
                const hidden = await reqwest(`https://assets.solarscan.com/hidden.json?${Date.now()}`, {
                    json: true
                });
                const { memo } = hidden.body;

                if (memo) {
                    commit("SAVE_HIDDEN", memo);
                }
            } catch {
                //
            }
        }
    }
};
