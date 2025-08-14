const buttonSend = document.querySelector("#send");

buttonSend.addEventListener("click", (e) => {
  console.log("Envoi du kudos");

  // Envoyer un message au content script pour colorer les liens
  browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    browser.tabs.sendMessage(tabs[0].id, { action: "colorLinksGreen" });
  });

  // Feedback visuel pour l'utilisateur
  buttonSend.textContent = "Liens colorés !";
  buttonSend.style.backgroundColor = "#28a745";
  buttonSend.disabled = true;

  // Remettre le bouton à l'état initial après 2 secondes
  setTimeout(() => {
    buttonSend.textContent = "Click to give kudos";
    buttonSend.style.backgroundColor = "#007bff";
    buttonSend.disabled = false;
  }, 2000);
});
