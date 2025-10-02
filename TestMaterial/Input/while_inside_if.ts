function mixed(flag: boolean) {
  if (flag) {
    while (false) {
      console.log("never");
    }
  }
}
