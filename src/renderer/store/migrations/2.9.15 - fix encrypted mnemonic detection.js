import { clone } from "lodash";

export default store => {
    store.getters["profile/all"].forEach(profile => {
        store.getters["wallet/byProfileId"](profile.id).forEach(wallet => {
            const updatedWallet = clone(wallet);

            if (wallet.passphrase) {
                updatedWallet.mnemonic = wallet.passphrase;
                delete updatedWallet.passphrase;
            }

            store.dispatch("wallet/update", updatedWallet);
        });
    });

    store.dispatch("app/setLatestAppliedMigration", "2.9.15");
};
