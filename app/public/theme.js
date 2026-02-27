(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mq.matches) {
    document.documentElement.classList.add("dark");
  }
  mq.addEventListener("change", function (e) {
    if (e.matches) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });
})();
