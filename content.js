// prevent duplicate injection
if (!document.getElementById("secondthought-btn")) {
  const btn = document.createElement("button");
  btn.id = "secondthought-btn";
  btn.innerText = "SecondThought?";

  btn.onclick = () => {
    alert("Buyer’s remorse check coming soon 👀");
  };

  document.body.appendChild(btn);
}
