// Descriptions for the prototype's exhibits (developer notes, in German).
// rating: 'leicht' | 'mittel' | 'schwer' | 'grenze'

export const EXHIBITS = [
  {
    id: 'potion', name: 'Heiltrank', room: 'Eingangshalle',
    technique: 'Von Hand (ASCII)', frames: 1, rating: 'leicht',
    note: 'Kleine Items mit klarer Silhouette kann ich zuverlässig Pixel für Pixel zeichnen. Bis etwa 24 px Höhe klappt das ohne Hilfsmittel.',
  },
  {
    id: 'sword', name: 'Schwert im Boden', room: 'Eingangshalle',
    technique: 'Von Hand (ASCII)', frames: 1, rating: 'leicht',
    note: 'Gerade Formen, Metallglanz und Kontrast sind einfach. Waffen, Schlüssel, Schriftrollen und ähnliche Items wären in Masse machbar.',
  },
  {
    id: 'coins', name: 'Münzhaufen mit Edelsteinen', room: 'Eingangshalle',
    technique: 'Prozedural gemalt', frames: 1, rating: 'mittel',
    note: 'Viele kleine, überlappende Teile werden schnell matschig. Die Edelsteine lesen sich, die einzelnen Münzen kaum. Hier würde ich größer zeichnen oder weniger Teile nehmen.',
  },
  {
    id: 'slime', name: 'Schleim', room: 'Kanal',
    technique: 'Prozedural gemalt', frames: 4, rating: 'leicht',
    note: 'Runde, weiche Formen mit Glanzlichtern sind die Stärke des Malers. Die Quetsch-Animation entsteht aus einer Formel, nicht aus vier Einzelbildern.',
  },
  {
    id: 'rat', name: 'Riesenratte', room: 'Kanal',
    technique: 'Prozedural gemalt', frames: 2, rating: 'mittel',
    note: 'Tiere in Seitenansicht gelingen gut. Schwächen: Das Fell ist nur angedeutet, die Bewegung beschränkt sich auf Schwanz und Nase. Ein echter Laufzyklus wäre deutlich mehr Arbeit.',
  },
  {
    id: 'goblin', name: 'Goblin und Schamane', room: 'Goblinhöhle',
    technique: 'Prozedural gemalt + Umfärbung', frames: 3, rating: 'schwer',
    note: 'Figuren mit Gesicht und Ausrüstung funktionieren, wirken aber etwas „gebaut“. Der violette Schamane ist dieselbe Figur, nur umgefärbt. So entstehen Gegnervarianten fast ohne Aufwand.',
  },
  {
    id: 'brazier', name: 'Feuerschale', room: 'Goblinhöhle',
    technique: 'Prozedural gemalt + animiertes Feuer', frames: 4, rating: 'leicht',
    note: 'Effekte wie Feuer, Leuchten und farbiges Licht liegen mir. Die blauen Schalen in der Gruft sind eine reine Umfärbung derselben Animation.',
  },
  {
    id: 'skeleton', name: 'Skelettkrieger', room: 'Gruft',
    technique: 'Prozedural gemalt', frames: 2, rating: 'schwer',
    note: 'Anatomie aus vielen Einzelteilen klappt überraschend gut. Grenzen: Die Pose ist steif, die Rippen sind grob. Angriff, Treffer und Tod als Animation wären jeweils eigene, aufwendige Posen.',
  },
  {
    id: 'spider', name: 'Höhlenspinne', room: 'Gruft',
    technique: 'Prozedural gemalt', frames: 2, rating: 'mittel',
    note: 'Beine aus Segmenten lassen sich gut erzeugen. Die Bewegung ist nur ein Zucken der Knie. Von vorne wirkt sie gut, eine Seitenansicht müsste ich neu bauen.',
  },
  {
    id: 'lootboxes', name: 'Loot-Boxen, sechs Stufen', room: 'Sponsoren-Lounge',
    technique: 'Prozedural gemalt', frames: 3, rating: 'mittel',
    note: 'Geometrische Objekte mit Leuchtnähten sind einfach. Bronze bis Celestial kosten nur je einen Farbsatz. Das kleine „B“-Emblem ist schon an der Grenze der Lesbarkeit.',
  },
  {
    id: 'portrait', name: 'Porträt einer Sponsor-Vertreterin', room: 'Sponsoren-Lounge',
    technique: 'Prozedural gemalt', frames: 1, rating: 'grenze',
    note: 'Menschliche Gesichter sind meine klare Grenze. Proportionen stimmen ungefähr, aber Ausdruck und Augen wirken unbeholfen. Für NPC-Porträts bräuchten wir eine andere Quelle, zum Beispiel KI-Bilder, die der Editor auf die Palette umrechnet.',
  },
];

export const RATING = {
  leicht: 'Leicht',
  mittel: 'Mittel',
  schwer: 'Schwer',
  grenze: 'Grenze',
};
