export const demoMessages = {
  heating: {
    senderName: "Anna Weber",
    senderEmail: "anna@example.invalid",
    subject: "Heating has stopped working again",
    category: "heating",
    body: "Guten Morgen, die Heizung in Wohnung 12 funktioniert wieder nicht. Letzten Monat war bereits jemand zur Reparatur da. Können Sie bitte nachsehen? Vielen Dank, Anna Weber.",
  },
  unknown_sender: {
    senderName: "Unmatched sender",
    senderEmail: "unknown@example.invalid",
    subject: "Heating issue — apartment not identified",
    category: "heating",
    body: "Hallo, meine Heizung funktioniert nicht. Können Sie mir helfen?",
  },
  missing_knowledge: {
    senderName: "Mia Schneider",
    senderEmail: "mia@example.invalid",
    subject: "Water dripping under the sink",
    category: "water",
    body: "Guten Tag, unter der Spüle tropft Wasser. Können Sie einen Termin zur Prüfung vereinbaren? Danke, Mia.",
  },
} as const;
