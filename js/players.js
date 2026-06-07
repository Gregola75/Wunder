/*
 * players.js — Jugadores del álbum oficial Panini FIFA World Cup 2026.
 *
 * Para cada selección hay 18 jugadores en el orden EXACTO de los cromos:
 * posiciones 2-12 y 14-20 de la página (el nº1 es el escudo y el nº13 la
 * foto del equipo, que no se incluyen aquí).
 *
 * Fuentes: checklists públicos (checklistinsider, laststicker, scanini, tcdb,
 * paniniwm2026sticker, diamondcardsonline...). Verificado contra dato real:
 * FRA 10 = Eduardo Camavinga. Cualquier nombre se puede corregir en la app
 * con el botón ✎ (se guarda en tu dispositivo).
 */

(function () {
  "use strict";

  window.PLAYERS = {
    // ---- Grupo A ----
    MEX: ["Luis Malagón", "Johan Vasquez", "Jorge Sánchez", "Cesar Montes", "Jesus Gallardo", "Israel Reyes", "Diego Lainez", "Carlos Rodriguez", "Edson Alvarez", "Orbelin Pineda", "Marcel Ruiz", "Érick Sánchez", "Hirving Lozano", "Santiago Giménez", "Raúl Jiménez", "Alexis Vega", "Roberto Alvarado", "Cesar Huerta"],
    RSA: ["Ronwen Williams", "Sipho Chaine", "Aubrey Modiba", "Samukele Kabini", "Mbekezeli Mbokazi", "Khulumani Ndamane", "Siyabonga Ngezana", "Khuliso Mudau", "Nkosinathi Sibisi", "Teboho Mokoena", "Thalente Mbatha", "Bathusi Aubaas", "Yaya Sithole", "Sipho Mbule", "Lyle Foster", "Iqraam Rayners", "Mohau Nkota", "Oswin Appollis"],
    KOR: ["Hyeon-woo Jo", "Seung-Gyu Kim", "Min-jae Kim", "Yu-min Cho", "Young-woo Seol", "Han-beom Lee", "Tae-seok Lee", "Myung-jae Lee", "Jae-sung Lee", "In-beom Hwang", "Kang-in Lee", "Seung-ho Paik", "Jens Castrop", "Dong-gyeong Lee", "Gue-sung Cho", "Heung-min Son", "Hee-chan Hwang", "Hyeon-Gyu Oh"],
    CZE: ["Matej Kovar", "Jindrich Stanek", "Ladislav Krejci", "Vladimir Coufal", "Jaroslav Zeleny", "Tomas Holes", "David Zima", "Michal Sadilek", "Lukas Provod", "Lukas Cerv", "Tomas Soucek", "Pavel Sulc", "Matej Vydra", "Vasil Kusej", "Tomas Chory", "Vaclav Cerny", "Adam Hlozek", "Patrik Schick"],

    // ---- Grupo B ----
    CAN: ["Dayne St.Clair", "Alphonso Davies", "Alistair Johnston", "Samuel Adekugbe", "Richie Laryea", "Derek Cornelius", "Moïse Bombito", "Kamal Miller", "Stephen Eustáquio", "Ismaël Koné", "Jonathan Osorio", "Jacob Shaffelburg", "Mathieu Choinière", "Niko Sigur", "Tajon Buchanan", "Liam Millar", "Cyle Larin", "Jonathan David"],
    BIH: ["Nikola Vasilj", "Amer Dedic", "Sead Kolasinac", "Tarik Muharemovic", "Nihad Mujakic", "Nikola Katic", "Amir Hadziahmetovic", "Benjamin Tahirovic", "Armin Gigovic", "Ivan Sunjic", "Ivan Basic", "Dzenis Burnic", "Esmir Bajraktarevic", "Amar Memic", "Ermedin Demirovic", "Edin Dzeko", "Samed Bazdar", "Haris Tabakovic"],
    QAT: ["Meshaal Barsham", "Sultan Albrake", "Lucas Mendes", "Homam Ahmed", "Boualem Khoukhi", "Pedro Miguel", "Tarek Salman", "Mohamed Al-Mannai", "Karim Boudiaf", "Assim Madibo", "Ahmed Fatehi", "Mohammed Waad", "Abdulaziz Hatem", "Hassan Al-Haydos", "Edmilson Junior", "Akram Hassan Afif", "Ahmed Al Ganehi", "Almoez Ali"],
    SUI: ["Gregor Kobel", "Yvon Mvogo", "Manuel Akanji", "Ricardo Rodriguez", "Nico Elvedi", "Aurèle Amenda", "Silvan Widmer", "Granit Xhaka", "Denis Zakaria", "Remo Freuler", "Fabian Rieder", "Ardon Jashari", "Johan Manzambi", "Michel Aebischer", "Breel Embolo", "Ruben Vargas", "Dan Ndoye", "Zeki Amdouni"],

    // ---- Grupo C ----
    BRA: ["Alisson", "Bento", "Marquinhos", "Éder Militão", "Gabriel Magalhães", "Danilo", "Wesley", "Lucas Paquetá", "Casemiro", "Bruno Guimarães", "Luiz Henrique", "Vinicius Júnior", "Rodrygo", "João Pedro", "Matheus Cunha", "Gabriel Martinelli", "Raphinha", "Estévão"],
    MAR: ["Yassine Bounou", "Munir El Kajoui", "Achraf Hakimi", "Noussair Mazraoui", "Nayef Aguerd", "Romain Saïss", "Jawad El Yamiq", "Adam Masina", "Sofyan Amrabat", "Azzedine Ounahi", "Eliesse Ben Seghir", "Bilal El Khannouss", "Ismael Saibari", "Youssef En-Nesyri", "Abde Ezzalzouli", "Soufiane Rahimi", "Brahim Díaz", "Ayoub El Kaabi"],
    HAI: ["Johny Placide", "Carlens Arcus", "Martin Experience", "Jean-Kevin Duverne", "Ricardo Adé", "Duke Lacroix", "Garven Metusala", "Hannes Delcroix", "Leverton Pierre", "Danley Jean Jacques", "Jean-Ricner Bellegarde", "Christopher Attys", "Derrick Etienne Jr", "Josue Casimir", "Ruben Providence", "Duckens Nazon", "Louicius Deedson", "Frantzdy Pierrot"],
    SCO: ["Angus Gunn", "Jack Hendry", "Kieran Tierney", "Aaron Hickey", "Andrew Robertson", "Scott McKenna", "John Souttar", "Anthony Ralston", "Grant Hanley", "Scott McTominay", "Billy Gilmour", "Lewis Ferguson", "Ryan Christie", "Kenny McLean", "John McGinn", "Lyndon Dykes", "Che Adams", "Ben Gannon-Doak"],

    // ---- Grupo D ----
    USA: ["Matt Freese", "Chris Richards", "Tim Ream", "Mark McKenzie", "Alex Freeman", "Antonee Robinson", "Tyler Adams", "Tanner Tessmann", "Weston McKennie", "Christian Roldan", "Timothy Weah", "Diego Luna", "Malik Tillman", "Christian Pulisic", "Brenden Aaronson", "Ricardo Pepi", "Haji Wright", "Folarin Balogun"],
    PAR: ["Roberto Fernández", "Orlando Gill", "Gustavo Gómez", "Fabián Balbuena", "Juan José Cáceres", "Omar Alderete", "Junior Alonso", "Mathías Villasanti", "Diego Gómez", "Damián Bobadilla", "Andrés Cubas", "Matías Galarza Fonda", "Julio Enciso", "Alejandro Romero Gamarra", "Miguel Almirón", "Ramón Sosa", "Ángel Romero", "Antonio Sanabria"],
    AUS: ["Mathew Ryan", "Joe Gauci", "Harry Souttar", "Alessandro Circati", "Jordan Bos", "Aziz Behich", "Cameron Burgess", "Lewis Miller", "Milos Degenek", "Jackson Irvine", "Riley McGree", "Aiden O'Neill", "Connor Metcalfe", "Patrick Yazbek", "Craig Goodwin", "Kusini Yengi", "Nestory Irankunda", "Mohamed Touré"],
    TUR: ["Uğurcan Çakır", "Mert Müldür", "Zeki Çelik", "Abdülkerim Bardakcı", "Çağlar Söyüncü", "Merih Demiral", "Ferdi Kadıoğlu", "Kaan Ayhan", "İsmail Yüksek", "Hakan Çalhanoğlu", "Orkun Kökçü", "Arda Güler", "İrfan Can Kahveci", "Yunus Akgün", "Can Uzun", "Barış Alper Yılmaz", "Kerem Aktürkoğlu", "Kenan Yıldız"],

    // ---- Grupo E ----
    GER: ["Marc-André ter Stegen", "Jonathan Tah", "David Raum", "Nico Schlotterbeck", "Antonio Rüdiger", "Waldemar Anton", "Ridle Baku", "Maximilian Mittelstädt", "Joshua Kimmich", "Florian Wirtz", "Felix Nmecha", "Leon Goretzka", "Jamal Musiala", "Serge Gnabry", "Kai Havertz", "Leroy Sané", "Karim Adeyemi", "Nick Woltemade"],
    CUW: ["Eloy Room", "Armando Obispo", "Sherel Floranus", "Jurien Gaari", "Joshua Brenet", "Roshon van Eijma", "Shurandy Sambo", "Livano Comenencia", "Godfried Roemeratoe", "Juninho Bacuna", "Leandro Bacuna", "Tahith Chong", "Kenji Gorre", "Jearl Margaritha", "Jurgen Locadia", "Jeremy Antonisse", "Gervane Kastaneer", "Sontje Hansen"],
    CIV: ["Yahia Fofana", "Ghislain Konan", "Wilfried Singo", "Odilon Kossounou", "Evan Ndicka", "Willy Boly", "Emmanuel Agbadou", "Ousmane Diomandé", "Franck Kessié", "Seko Fofana", "Ibrahim Sangaré", "Jean-Philippe Gbamin", "Amad Diallo", "Sébastien Haller", "Simon Adingra", "Yan Diomandé", "Evann Guessand", "Oumar Diakité"],
    ECU: ["Hernán Galíndez", "Gonzalo Valle", "Piero Hincapié", "Pervis Estupiñán", "Willian Pacho", "Ángelo Preciado", "Joel Ordóñez", "Moisés Caicedo", "Alan Franco", "Kendry Páez", "Pedro Vite", "John Yeboah", "Leonardo Campana", "Gonzalo Plata", "Nilson Angulo", "Alan Minda", "Kevin Rodríguez", "Enner Valencia"],

    // ---- Grupo F ----
    NED: ["Bart Verbruggen", "Virgil van Dijk", "Micky van de Ven", "Jurriën Timber", "Denzel Dumfries", "Nathan Aké", "Jeremie Frimpong", "Jan Paul van Hecke", "Tijjani Reijnders", "Ryan Gravenberch", "Teun Koopmeiners", "Frenkie de Jong", "Xavi Simons", "Justin Kluivert", "Memphis Depay", "Donyell Malen", "Wout Weghorst", "Cody Gakpo"],
    JPN: ["Zion Suzuki", "Henry Hiroki Mochizuki", "Ayumu Seko", "Junnosuke Suzuki", "Shogo Taniguchi", "Tsuyoshi Watanabe", "Kaishu Sano", "Yuki Soma", "Ao Tanaka", "Daichi Kamada", "Takefusa Kubo", "Ritsu Doan", "Keito Nakamura", "Takumi Minamino", "Shuto Machino", "Junya Ito", "Koki Ogawa", "Ayase Ueda"],
    SWE: ["Victor Johansson", "Isak Hien", "Gabriel Gudmundsson", "Emil Holm", "Victor Nilsson Lindelöf", "Gustaf Lagerbielke", "Lucas Bergvall", "Hugo Larsson", "Jesper Karlström", "Yasin Ayari", "Mattias Svanberg", "Daniel Svensson", "Ken Sema", "Roony Bardghji", "Dejan Kulusevski", "Anthony Elanga", "Alexander Isak", "Viktor Gyökeres"],
    TUN: ["Bechir Ben Said", "Aymen Dahmen", "Yan Valery", "Montassar Talbi", "Yassine Meriah", "Ali Abdi", "Dylan Bronn", "Ellyes Skhiri", "Aïssa Laïdouni", "Ferjani Sassi", "Mohamed Ali Ben Romdhane", "Hannibal Mejbri", "Elias Achouri", "Elias Saad", "Hazem Mastouri", "Ismael Gharbi", "Sayfallah Ltaief", "Naïm Sliti"],

    // ---- Grupo G ----
    BEL: ["Thibaut Courtois", "Arthur Theate", "Timothy Castagne", "Zeno Debast", "Brandon Mechele", "Maxim De Cuyper", "Thomas Meunier", "Youri Tielemans", "Amadou Onana", "Nicolas Raskin", "Alexis Saelemaekers", "Hans Vanaken", "Kevin De Bruyne", "Jérémy Doku", "Charles De Ketelaere", "Leandro Trossard", "Loïs Openda", "Romelu Lukaku"],
    EGY: ["Mohamed El Shenawy", "Mohamed Hany", "Mohamed Hamdy", "Yasser Ibrahim", "Khaled Sobhi", "Ramy Rabia", "Hossam Abdelmaguid", "Ahmed Fatouh", "Marwan Attia", "Zizo", "Hamdy Fathy", "Mohamed Lasheen", "Emam Ashour", "Osama Faisal", "Mohamed Salah", "Mostafa Mohamed", "Trezeguet", "Omar Marmoush"],
    IRN: ["Alireza Beiranvand", "Morteza Pouraliganji", "Ehsan Hajsafi", "Milad Mohammadi", "Shojae Khalilzadeh", "Ramin Rezaeian", "Hossein Kanaani", "Sadegh Moharrami", "Saleh Hardani", "Saeed Ezatolahi", "Saman Ghoddos", "Omid Noorafkan", "Roozbeh Cheshmi", "Mohammad Mohebi", "Sardar Azmoun", "Mehdi Taremi", "Alireza Jahanbakhsh", "Ali Gholizadeh"],
    NZL: ["Max Crocombe", "Alex Paulsen", "Michael Boxall", "Liberato Cacace", "Tim Payne", "Tyler Bindon", "Francis de Vries", "Finn Surman", "Joe Bell", "Sarpreet Singh", "Ryan Thomas", "Matthew Garbett", "Marko Stamenić", "Ben Old", "Chris Wood", "Elijah Just", "Callum McCowatt", "Kosta Barbarouses"],

    // ---- Grupo H ----
    ESP: ["Unai Simón", "Robin Le Normand", "Aymeric Laporte", "Dean Huijsen", "Pedro Porro", "Dani Carvajal", "Marc Cucurella", "Martín Zubimendi", "Rodri", "Pedri", "Fabián Ruiz", "Mikel Merino", "Lamine Yamal", "Dani Olmo", "Nico Williams", "Ferran Torres", "Álvaro Morata", "Mikel Oyarzabal"],
    CPV: ["Vozinha", "Logan Costa", "Pico", "Diney", "Steven Moreira", "Wagner Pina", "João Paulo", "Yannick Semedo", "Kevin Pina", "Patrick Andrade", "Jamiro Monteiro", "Deroy Duarte", "Garry Rodrigues", "Jovane Cabral", "Ryan Mendes", "Dailon Livramento", "Willy Semedo", "Bebe"],
    KSA: ["Nawaf Alaqidi", "Abdulrahman Al-Sanbi", "Saud Abdulhamid", "Nawaf Boushal", "Jihad Thakri", "Moteb Al-Harbi", "Hassan Altambakti", "Musab Aljuwayr", "Ziyad Aljohani", "Abdullah Alkhaibari", "Nasser Aldawsari", "Saleh Abu Alshamat", "Marwan Alsahafi", "Salem Aldawsari", "Abdulrahman Al-Aboud", "Feras Albrikan", "Saleh Alshehri", "Abdullah Al-Hamdan"],
    URU: ["Sergio Rochet", "Santiago Mele", "Ronald Araújo", "José María Giménez", "Sebastián Cáceres", "Mathías Olivera", "Guillermo Varela", "Nahitan Nández", "Federico Valverde", "Giorgian De Arrascaeta", "Rodrigo Bentancur", "Manuel Ugarte", "Nicolás de la Cruz", "Maxi Araújo", "Darwin Núñez", "Federico Viñas", "Rodrigo Aguirre", "Facundo Pellistri"],

    // ---- Grupo I ----
    FRA: ["Mike Maignan", "Theo Hernandez", "William Saliba", "Jules Kounde", "Ibrahima Konate", "Dayot Upamecano", "Lucas Digne", "Aurélien Tchouaméni", "Eduardo Camavinga", "Manu Kone", "Adrien Rabiot", "Michael Olise", "Ousmane Dembele", "Bradley Barcola", "Désiré Doué", "Kingsley Coman", "Hugo Ekitike", "Kylian Mbappe"],
    SEN: ["Edouard Mendy", "Yehvann Diouf", "Moussa Niakhaté", "Abdoulaye Seck", "Ismail Jakobs", "El Hadji Malick Diouf", "Kalidou Koulibaly", "Idrissa Gana Gueye", "Pape Matar Sarr", "Pape Gueye", "Habib Diarra", "Lamine Camara", "Sadio Mane", "Ismaïla Sarr", "Boulaye Dia", "Iliman Ndiaye", "Nicolas Jackson", "Krepin Diatta"],
    IRQ: ["Jalal Hassan", "Rebin Sulaka", "Hussein Ali", "Akam Hashem", "Merchas Doski", "Zaid Tahseen", "Manaf Younis", "Zidane Iqbal", "Amir Al-Ammari", "Ibrahim Bayesh", "Ali Jasim", "Youssef Amyn", "Aimar Sher", "Marko Farji", "Osama Rashid", "Ali Al-Hamadi", "Aymen Hussein", "Mohanad Ali"],
    NOR: ["Orjan Nyland", "Julian Ryerson", "Leo Ostigård", "Kristoffer Vassbakk Ajer", "Marcus Holmgren Pedersen", "David Møller Wolfe", "Torbjørn Heggem", "Morten Thorsby", "Martin Ødegaard", "Sander Berge", "Andreas Schjelderup", "Patrick Berg", "Erling Haaland", "Alexander Sørloth", "Aron Dønnum", "Jorgen Strand Larsen", "Antonio Nusa", "Oscar Bobb"],

    // ---- Grupo J ----
    ARG: ["Emiliano Martinez", "Nahuel Molina", "Cristian Romero", "Nicolas Otamendi", "Nicolas Tagliafico", "Leonardo Balerdi", "Enzo Fernandez", "Alexis Mac Allister", "Rodrigo De Paul", "Exequiel Palacios", "Leandro Paredes", "Nico Paz", "Franco Mastantuono", "Nico Gonzalez", "Lionel Messi", "Lautaro Martinez", "Julian Alvarez", "Giuliano Simeone"],
    ALG: ["Alexis Guendouz", "Ramy Bensebaini", "Youcef Atal", "Rayan Aït-Nouri", "Mohamed Amine Tougai", "Aïssa Mandi", "Ismael Bennacer", "Houssem Aouar", "Hicham Boudaoui", "Ramiz Zerrouki", "Nabil Bentaleb", "Farés Chaibi", "Riyad Mahrez", "Said Benrahma", "Anis Hadj Moussa", "Amine Gouiri", "Baghdad Bounedjah", "Mohammed Amoura"],
    AUT: ["Alexander Schlager", "Patrick Pentz", "David Alaba", "Kevin Danso", "Philipp Lienhart", "Stefan Posch", "Phillipp Mwene", "Alexander Prass", "Xaver Schlager", "Marcel Sabitzer", "Konrad Laimer", "Florian Grillitsch", "Nicolas Seiwald", "Romano Schmid", "Patrick Wimmer", "Christoph Baumgartner", "Michael Gregoritsch", "Marko Arnautović"],
    JOR: ["Yazeed Abulaila", "Ihsan Haddad", "Mohammad Abu Hashish", "Yazan Al-Arab", "Abdallah Nasib", "Saleem Obaid", "Mohammad Abualnadi", "Ibrahim Saadeh", "Nizar Al-Rashdan", "Noor Al-Rawabdeh", "Mohannad Abu Taha", "Amer Jamous", "Musa Al-Taamari", "Yazan Al-Naimat", "Mahmoud Al-Mardi", "Ali Olwan", "Mohammad Abu Zrayq", "Ibrahim Sabra"],

    // ---- Grupo K ----
    POR: ["Diogo Costa", "Jose Sa", "Ruben Dias", "João Cancelo", "Diogo Dalot", "Nuno Mendes", "Gonçalo Inácio", "Bernardo Silva", "Bruno Fernandes", "Ruben Neves", "Vitinha", "João Neves", "Cristiano Ronaldo", "Francisco Trincao", "João Felix", "Gonçalo Ramos", "Pedro Neto", "Rafael Leão"],
    COD: ["Lionel Mpasi", "Aaron Wan-Bissaka", "Axel Tuanzebe", "Arthur Masuaku", "Chancel Mbemba", "Joris Kayembe", "Charles Pickel", "Ngal'ayel Mukau", "Edo Kayembe", "Samuel Moutoussamy", "Noah Sadiki", "Théo Bongonda", "Meschak Elia", "Yoane Wissa", "Brian Cipenga", "Fiston Mayele", "Cédric Bakambu", "Nathanaël Mbuku"],
    UZB: ["Utkir Yusupov", "Farrukh Sayfiev", "Sherzod Nasrullaev", "Umar Eshmurodov", "Husniddin Aliqulov", "Rustamjon Ashurmatov", "Khojiakbar Alijonov", "Abdukodir Khusanov", "Odiljon Hamrobekov", "Otabek Shukurov", "Jamshid Iskanderov", "Azizbek Turgunboev", "Khojimat Erkinov", "Eldor Shomurodov", "Oston Urunov", "Jaloliddin Masharipov", "Igor Sergeev", "Abbosbek Fayzullaev"],
    COL: ["Camilo Vargas", "David Ospina", "Dávinson Sánchez", "Yerry Mina", "Daniel Munoz", "Johan Mojica", "Jhon Lucumí", "Santiago Arias", "Jefferson Lerma", "Kevin Castaño", "Richard Rios", "James Rodriguez", "Juan Fernando Quintero", "Jorge Carrascal", "Jhon Arias", "Jhon Cordova", "Luis Suarez", "Luis Diaz"],

    // ---- Grupo L ----
    ENG: ["Jordan Pickford", "John Stones", "Marc Guéhi", "Ezri Konsa", "Trent Alexander-Arnold", "Reece James", "Dan Burn", "Jordan Henderson", "Declan Rice", "Jude Bellingham", "Cole Palmer", "Morgan Rogers", "Anthony Gordon", "Phil Foden", "Bukayo Saka", "Harry Kane", "Marcus Rashford", "Ollie Watkins"],
    CRO: ["Dominik Livaković", "Duje Caleta-Car", "Josko Gvardiol", "Josip Stanišić", "Luka Vušković", "Josip Sutalo", "Kristijan Jakic", "Luka Modrić", "Mateo Kovacic", "Martin Baturina", "Lovro Majer", "Mario Pasalic", "Petar Sucic", "Ivan Perišić", "Marco Pasalic", "Ante Budimir", "Andrej Kramarić", "Franjo Ivanovic"],
    GHA: ["Lawrence Ati Zigi", "Tariq Lamptey", "Mohammed Salisu", "Alidu Seidu", "Alexander Djiku", "Gideon Mensah", "Caleb Yirenkyi", "Abdul Issahaku Fatawu", "Thomas Partey", "Salis Abdul Samed", "Kamaldeen Sulemana", "Mohammed Kudus", "Inaki Williams", "Jordan Ayew", "Andrew Ayew", "Joseph Paintsil", "Osman Bukari", "Antoine Semenyo"],
    PAN: ["Orlando Mosquera", "Luis Mejia", "Fidel Escobar", "Andres Andrade", "Michael Amir Murillo", "Eric Davis", "Jose Cordoba", "Cesar Blackman", "Cristian Martinez", "Aníbal Godoy", "Adalberto Carrasquilla", "Édgar Bárcenas", "Carlos Harvey", "Ismael Díaz", "Jose Fajardo", "Cecilio Waterman", "José Luis Rodríguez", "Alberto Quintero"],
  };
})();
