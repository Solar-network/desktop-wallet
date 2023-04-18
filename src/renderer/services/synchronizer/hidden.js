export default async synchronizer => {
    await synchronizer.$store.dispatch("hidden/fetch");
};
