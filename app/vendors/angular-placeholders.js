/**
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/**
 * This is based, in part, on [fkadeveloper](https://github.com/fkadeveloper)'s
 * [lorem.js](https://github.com/fkadeveloper/loremjs).
 */
angular.module( 'ngPlaceholders', [] )

  .factory( 'PlaceholderTextService', function () {

    var words = ["lorem", "ipsum", "dolor", "sit", "amet,", "consectetur", "adipiscing",
      "elit", "ut", "aliquam,", "purus", "sit", "amet", "luctus", "venenatis,",
      "lectus", "magna", "fringilla", "urna,", "porttitor", "rhoncus", "dolor",
      "purus", "non", "enim", "praesent", "elementum", "facilisis", "leo,", "vel",
      "fringilla", "est", "ullamcorper", "eget", "nulla", "facilisi", "etiam",
      "dignissim", "diam", "quis", "enim", "lobortis", "scelerisque", "fermentum",
      "dui", "faucibus", "in", "ornare", "quam", "viverra", "orci", "sagittis", "eu",
      "volutpat", "odio", "facilisis", "mauris", "sit", "amet", "massa", "vitae",
      "tortor", "condimentum", "lacinia", "quis", "vel", "eros", "donec", "ac",
      "odio", "tempor", "orci", "dapibus", "ultrices", "in", "iaculis", "nunc",
      "sed", "augue", "lacus,", "viverra", "vitae", "congue", "eu,", "consequat",
      "ac", "felis", "donec", "et", "odio", "pellentesque", "diam", "volutpat",
      "commodo", "sed", "egestas", "egestas", "fringilla", "phasellus", "faucibus",
      "scelerisque", "eleifend", "donec", "pretium", "vulputate", "sapien", "nec",
      "sagittis", "aliquam", "malesuada", "bibendum", "arcu", "vitae", "elementum",
      "curabitur", "vitae", "nunc", "sed", "velit", "dignissim", "sodales", "ut",
      "eu", "sem", "integer", "vitae", "justo", "eget", "magna", "fermentum",
      "iaculis", "eu", "non", "diam", "phasellus", "vestibulum", "lorem", "sed",
      "risus", "ultricies", "tristique", "nulla", "aliquet", "enim", "tortor,", "at",
      "auctor", "urna", "nunc", "id", "cursus", "metus", "aliquam", "eleifend", "mi",
      "in", "nulla", "posuere", "sollicitudin", "aliquam", "ultrices", "sagittis",
      "orci,", "a", "scelerisque", "purus", "semper", "eget", "duis", "at", "tellus",
      "at", "urna", "condimentum", "mattis", "pellentesque", "id", "nibh", "tortor,",
      "id", "aliquet", "lectus", "proin", "nibh", "nisl,", "condimentum", "id",
      "venenatis", "a,", "condimentum", "vitae", "sapien", "pellentesque",
      "habitant", "morbi", "tristique", "senectus", "et", "netus", "et", "malesuada",
      "fames", "ac", "turpis", "egestas", "sed", "tempus,", "urna", "et", "pharetra",
      "pharetra,", "massa", "massa", "ultricies", "mi,", "quis", "hendrerit",
      "dolor", "magna", "eget", "est", "lorem", "ipsum", "dolor", "sit", "amet,",
      "consectetur", "adipiscing", "elit", "pellentesque", "habitant", "morbi",
      "tristique", "senectus", "et", "netus", "et", "malesuada", "fames", "ac",
      "turpis", "egestas", "integer", "eget", "aliquet", "nibh", "praesent",
      "tristique", "magna", "sit", "amet", "purus", "gravida", "quis", "blandit",
      "turpis", "cursus", "in", "hac", "habitasse", "platea", "dictumst", "quisque",
      "sagittis,", "purus", "sit", "amet", "volutpat", "consequat,", "mauris",
      "nunc", "congue", "nisi,", "vitae", "suscipit", "tellus", "mauris", "a",
      "diam", "maecenas", "sed", "enim", "ut", "sem", "viverra", "aliquet", "eget",
      "sit", "amet", "tellus", "cras", "adipiscing", "enim", "eu", "turpis",
      "egestas", "pretium", "aenean", "pharetra,", "magna", "ac", "placerat",
      "vestibulum,", "lectus", "mauris", "ultrices", "eros,", "in", "cursus",
      "turpis", "massa", "tincidunt", "dui", "ut", "ornare", "lectus", "sit", "amet",
      "est", "placerat", "in", "egestas", "erat", "imperdiet", "sed", "euismod",
      "nisi", "porta", "lorem", "mollis", "aliquam", "ut", "porttitor", "leo", "a",
      "diam", "sollicitudin", "tempor", "id", "eu", "nisl", "nunc", "mi", "ipsum,",
      "faucibus", "vitae", "aliquet", "nec,", "ullamcorper", "sit", "amet", "risus",
      "nullam", "eget", "felis", "eget", "nunc", "lobortis", "mattis", "aliquam",
      "faucibus", "purus", "in", "massa", "tempor", "nec", "feugiat", "nisl",
      "pretium", "fusce", "id", "velit", "ut", "tortor", "pretium", "viverra",
      "suspendisse", "potenti", "nullam", "ac", "tortor", "vitae", "purus",
      "faucibus", "ornare", "suspendisse", "sed", "nisi", "lacus,", "sed", "viverra",
      "tellus", "in", "hac", "habitasse", "platea", "dictumst", "vestibulum",
      "rhoncus", "est", "pellentesque", "elit", "ullamcorper", "dignissim", "cras",
      "tincidunt", "lobortis", "feugiat", "vivamus", "at", "augue", "eget", "arcu",
      "dictum", "varius", "duis", "at", "consectetur", "lorem", "donec", "massa",
      "sapien,", "faucibus", "et", "molestie", "ac,", "feugiat", "sed", "lectus",
      "vestibulum", "mattis", "ullamcorper", "velit", "sed", "ullamcorper", "morbi",
      "tincidunt", "ornare", "massa,", "eget", "egestas", "purus", "viverra",
      "accumsan", "in", "nisl", "nisi,", "scelerisque", "eu", "ultrices", "vitae,",
      "auctor", "eu", "augue", "ut", "lectus", "arcu,", "bibendum", "at", "varius",
      "vel,", "pharetra", "vel", "turpis", "nunc", "eget", "lorem", "dolor,", "sed",
      "viverra", "ipsum", "nunc", "aliquet", "bibendum", "enim,", "facilisis",
      "gravida", "neque", "convallis", "a", "cras", "semper", "auctor", "neque,",
      "vitae", "tempus", "quam", "pellentesque", "nec", "nam", "aliquam", "sem",
      "et", "tortor", "consequat", "id", "porta", "nibh", "venenatis", "cras", "sed",
      "felis", "eget", "velit", "aliquet", "sagittis", "id", "consectetur", "purus",
      "ut", "faucibus", "pulvinar", "elementum", "integer", "enim", "neque,",
      "volutpat", "ac", "tincidunt", "vitae,", "semper", "quis", "lectus", "nulla",
      "at", "volutpat", "diam", "ut", "venenatis", "tellus", "in", "metus",
      "vulputate", "eu", "scelerisque", "felis", "imperdiet", "proin", "fermentum",
      "leo", "vel", "orci", "porta", "non", "pulvinar", "neque", "laoreet",
      "suspendisse", "interdum", "consectetur", "libero,", "id", "faucibus", "nisl",
      "tincidunt", "eget", "nullam", "non", "nisi", "est,", "sit", "amet",
      "facilisis", "magna", "etiam", "tempor,", "orci", "eu", "lobortis",
      "elementum,", "nibh", "tellus", "molestie", "nunc,", "non", "blandit", "massa",
      "enim", "nec", "dui", "nunc", "mattis", "enim", "ut", "tellus", "elementum",
      "sagittis", "vitae", "et", "leo", "duis", "ut", "diam", "quam", "nulla",
      "porttitor", "massa", "id", "neque", "aliquam", "vestibulum", "morbi",
      "blandit", "cursus", "risus,", "at", "ultrices", "mi", "tempus", "imperdiet",
      "nulla", "malesuada", "pellentesque", "elit", "eget", "gravida", "cum",
      "sociis", "natoque", "penatibus", "et", "magnis", "dis", "parturient",
      "montes,", "nascetur", "ridiculus", "mus", "mauris", "vitae", "ultricies",
      "leo", "integer", "malesuada", "nunc", "vel", "risus", "commodo", "viverra",
      "maecenas", "accumsan,", "lacus", "vel", "facilisis", "volutpat,", "est",
      "velit", "egestas", "dui,", "id", "ornare", "arcu", "odio", "ut", "sem",
      "nulla", "pharetra", "diam", "sit", "amet", "nisl", "suscipit", "adipiscing",
      "bibendum", "est", "ultricies", "integer", "quis", "auctor", "elit", "sed",
      "vulputate", "mi", "sit", "amet", "mauris", "commodo", "quis", "imperdiet",
      "massa", "tincidunt", "nunc", "pulvinar", "sapien", "et", "ligula",
      "ullamcorper", "malesuada", "proin", "libero", "nunc,", "consequat",
      "interdum", "varius", "sit", "amet,", "mattis", "vulputate", "enim", "nulla",
      "aliquet", "porttitor", "lacus,", "luctus", "accumsan", "tortor", "posuere",
      "ac", "ut", "consequat", "semper", "viverra", "nam", "libero", "justo,",
      "laoreet", "sit", "amet", "cursus", "sit", "amet,", "dictum", "sit", "amet",
      "justo", "donec", "enim", "diam,", "vulputate", "ut", "pharetra", "sit",
      "amet,", "aliquam", "id", "diam", "maecenas", "ultricies", "mi", "eget",
      "mauris", "pharetra", "et", "ultrices", "neque", "ornare", "aenean", "euismod",
      "elementum", "nisi,", "quis", "eleifend", "quam", "adipiscing", "vitae",
      "proin", "sagittis,", "nisl", "rhoncus", "mattis", "rhoncus,", "urna", "neque",
      "viverra", "justo,", "nec", "ultrices", "dui", "sapien", "eget", "mi", "proin",
      "sed", "libero", "enim,", "sed", "faucibus", "turpis", "in", "eu", "mi",
      "bibendum", "neque", "egestas", "congue", "quisque", "egestas", "diam", "in",
      "arcu", "cursus", "euismod", "quis", "viverra", "nibh", "cras", "pulvinar",
      "mattis", "nunc,", "sed", "blandit", "libero", "volutpat", "sed", "cras",
      "ornare", "arcu", "dui", "vivamus", "arcu", "felis,", "bibendum", "ut",
      "tristique", "et,", "egestas", "quis", "ipsum", "suspendisse", "ultrices",
      "fusce", "ut", "placerat", "orci", "nulla", "pellentesque",
      "dignissim", "enim,", "sit", "amet", "venenatis", "urna", "cursus", "eget",
      "nunc", "scelerisque", "viverra", "mauris,", "in", "aliquam", "sem",
      "fringilla", "ut", "morbi", "tincidunt", "augue", "interdum", "velit",
      "euismod", "in", "pellentesque", "massa", "placerat", "duis", "ultricies",
      "lacus", "sed", "turpis", "tincidunt", "id", "aliquet", "risus", "feugiat",
      "in", "ante", "metus,", "dictum", "at", "tempor", "commodo,", "ullamcorper",
      "a", "lacus", "vestibulum", "sed", "arcu", "non", "odio", "euismod", "lacinia",
      "at", "quis", "risus", "sed", "vulputate", "odio", "ut", "enim", "blandit",
      "volutpat", "maecenas", "volutpat", "blandit", "aliquam", "etiam", "erat",
      "velit,", "scelerisque", "in", "dictum", "non,", "consectetur", "a", "erat",
      "nam", "at", "lectus", "urna", "duis", "convallis", "convallis", "tellus,",
      "id", "interdum", "velit", "laoreet", "id", "donec", "ultrices", "tincidunt",
      "arcu,", "non", "sodales", "neque", "sodales", "ut", "etiam", "sit", "amet",
      "nisl", "purus,", "in", "mollis", "nunc", "sed", "id", "semper", "risus", "in",
      "hendrerit", "gravida", "rutrum", "quisque", "non", "tellus", "orci,", "ac",
      "auctor", "augue", "mauris", "augue", "neque,", "gravida", "in", "fermentum",
      "et,", "sollicitudin", "ac", "orci", "phasellus", "egestas", "tellus",
      "rutrum", "tellus", "pellentesque", "eu", "tincidunt", "tortor", "aliquam",
      "nulla", "facilisi", "cras", "fermentum,", "odio", "eu", "feugiat", "pretium,",
      "nibh", "ipsum", "consequat", "nisl,", "vel", "pretium", "lectus", "quam",
      "id", "leo", "in", "vitae", "turpis", "massa", "sed", "elementum", "tempus",
      "egestas", "sed", "sed", "risus", "pretium", "quam", "vulputate", "dignissim",
      "suspendisse", "in", "est", "ante", "in", "nibh", "mauris,", "cursus",
      "mattis", "molestie", "a,", "iaculis", "at", "erat", "pellentesque",
      "adipiscing", "commodo", "elit,", "at", "imperdiet", "dui", "accumsan", "sit",
      "amet", "nulla", "facilisi", "morbi", "tempus", "iaculis", "urna,", "id",
      "volutpat", "lacus", "laoreet", "non", "curabitur", "gravida", "arcu", "ac",
      "tortor", "dignissim", "convallis", "aenean", "et", "tortor", "at", "risus",
      "viverra", "adipiscing", "at", "in", "tellus", "integer", "feugiat",
      "scelerisque", "varius", "morbi", "enim", "nunc,", "faucibus", "a",
      "pellentesque", "sit", "amet,", "porttitor", "eget", "dolor", "morbi", "non",
      "arcu", "risus,", "quis", "varius", "quam", "quisque", "id", "diam", "vel",
      "quam", "elementum", "pulvinar", "etiam", "non", "quam", "lacus",
      "suspendisse", "faucibus", "interdum", "posuere", "lorem", "ipsum", "dolor",
      "sit", "amet,", "consectetur", "adipiscing", "elit", "duis", "tristique",
      "sollicitudin", "nibh", "sit", "amet", "commodo", "nulla", "facilisi",
      "nullam", "vehicula", "ipsum", "a", "arcu", "cursus", "vitae", "congue",
      "mauris", "rhoncus", "aenean", "vel", "elit", "scelerisque", "mauris",
      "pellentesque", "pulvinar", "pellentesque", "habitant", "morbi", "tristique",
      "senectus", "et", "netus", "et", "malesuada", "fames", "ac", "turpis",
      "egestas", "maecenas", "pharetra", "convallis", "posuere", "morbi", "leo",
      "urna,", "molestie", "at", "elementum", "eu,", "facilisis", "sed", "odio",
      "morbi", "quis", "commodo", "odio", "aenean", "sed", "adipiscing", "diam",
      "donec", "adipiscing", "tristique", "risus", "nec", "feugiat", "in",
      "fermentum", "posuere", "urna", "nec", "tincidunt", "praesent", "semper",
      "feugiat", "nibh", "sed", "pulvinar", "proin", "gravida", "hendrerit",
      "lectus", "a", "molestie", "gravida", "dictum"
    ];


    var name = {
      "first_name": ["Aaliyah","Aaron","Abagail","Abbey","Abbie","Abbigail","Abby","Abdiel","Abdul","Abdullah","Abe","Abel","Abelardo","Abigail","Abigale","Abigayle","Abner","Abraham","Ada","Adah","Adalberto","Adaline","Adam","Adan","Addie","Addison","Adela","Adelbert","Adele","Adelia","Adeline","Adell","Adella","Adelle","Aditya","Adolf","Adolfo","Adolph","Adolphus","Adonis","Adrain","Adrian","Adriana","Adrianna","Adriel","Adrien","Adrienne","Afton","Aglae","Agnes","Agustin","Agustina","Ahmad","Ahmed","Aida","Aidan","Aiden","Aileen","Aimee","Aisha","Aiyana","Akeem","Al","Alaina","Alan","Alana","Alanis","Alanna","Alayna","Alba","Albert","Alberta","Albertha","Alberto","Albin","Albina","Alda","Alden","Alec","Aleen","Alejandra","Alejandrin","Alek","Alena","Alene","Alessandra","Alessandro","Alessia","Aletha","Alex","Alexa","Alexander","Alexandra","Alexandre","Alexandrea","Alexandria","Alexandrine","Alexandro","Alexane","Alexanne","Alexie","Alexis","Alexys","Alexzander","Alf","Alfonso","Alfonzo","Alford","Alfred","Alfreda","Alfredo","Ali","Alia","Alice","Alicia","Alisa","Alisha","Alison","Alivia","Aliya","Aliyah","Aliza","Alize","Allan","Allen","Allene","Allie","Allison","Ally","Alphonso","Alta","Althea","Alva","Alvah","Alvena","Alvera","Alverta","Alvina","Alvis","Alyce","Alycia","Alysa","Alysha","Alyson","Alysson","Amalia","Amanda","Amani","Amara","Amari","Amaya","Amber","Ambrose","Amelia","Amelie","Amely","America","Americo","Amie","Amina","Amir","Amira","Amiya","Amos","Amparo","Amy","Amya","Ana","Anabel","Anabelle","Anahi","Anais","Anastacio","Anastasia","Anderson","Andre","Andreane","Andreanne","Andres","Andrew","Andy","Angel","Angela","Angelica","Angelina","Angeline","Angelita","Angelo","Angie","Angus","Anibal","Anika","Anissa","Anita","Aniya","Aniyah","Anjali","Anna","Annabel","Annabell","Annabelle","Annalise","Annamae","Annamarie","Anne","Annetta","Annette","Annie","Ansel","Ansley","Anthony","Antoinette","Antone","Antonetta","Antonette","Antonia","Antonietta","Antonina","Antonio","Antwan","Antwon","Anya","April","Ara","Araceli","Aracely","Arch","Archibald","Ardella","Arden","Ardith","Arely","Ari","Ariane","Arianna","Aric","Ariel","Arielle","Arjun","Arlene","Arlie","Arlo","Armand","Armando","Armani","Arnaldo","Arne","Arno","Arnold","Arnoldo","Arnulfo","Aron","Art","Arthur","Arturo","Arvel","Arvid","Arvilla","Aryanna","Asa","Asha","Ashlee","Ashleigh","Ashley","Ashly","Ashlynn","Ashton","Ashtyn","Asia","Assunta","Astrid","Athena","Aubree","Aubrey","Audie","Audra","Audreanne","Audrey","August","Augusta","Augustine","Augustus","Aurelia","Aurelie","Aurelio","Aurore","Austen","Austin","Austyn","Autumn","Ava","Avery","Avis","Axel","Ayana","Ayden","Ayla","Aylin","Baby","Bailee","Bailey","Barbara","Barney","Baron","Barrett","Barry","Bart","Bartholome","Barton","Baylee","Beatrice","Beau","Beaulah","Bell","Bella","Belle","Ben","Benedict","Benjamin","Bennett","Bennie","Benny","Benton","Berenice","Bernadette","Bernadine","Bernard","Bernardo","Berneice","Bernhard","Bernice","Bernie","Berniece","Bernita","Berry","Bert","Berta","Bertha","Bertram","Bertrand","Beryl","Bessie","Beth","Bethany","Bethel","Betsy","Bette","Bettie","Betty","Bettye","Beulah","Beverly","Bianka","Bill","Billie","Billy","Birdie","Blair","Blaise","Blake","Blanca","Blanche","Blaze","Bo","Bobbie","Bobby","Bonita","Bonnie","Boris","Boyd","Brad","Braden","Bradford","Bradley","Bradly","Brady","Braeden","Brain","Brandi","Brando","Brandon","Brandt","Brandy","Brandyn","Brannon","Branson","Brant","Braulio","Braxton","Brayan","Breana","Breanna","Breanne","Brenda","Brendan","Brenden","Brendon","Brenna","Brennan","Brennon","Brent","Bret","Brett","Bria","Brian","Briana","Brianne","Brice","Bridget","Bridgette","Bridie","Brielle","Brigitte","Brionna","Brisa","Britney","Brittany","Brock","Broderick","Brody","Brook","Brooke","Brooklyn","Brooks","Brown","Bruce","Bryana","Bryce","Brycen","Bryon","Buck","Bud","Buddy","Buford","Bulah","Burdette","Burley","Burnice","Buster","Cade","Caden","Caesar","Caitlyn","Cale","Caleb","Caleigh","Cali","Calista","Callie","Camden","Cameron","Camila","Camilla","Camille","Camren","Camron","Camryn","Camylle","Candace","Candelario","Candice","Candida","Candido","Cara","Carey","Carissa","Carlee","Carleton","Carley","Carli","Carlie","Carlo","Carlos","Carlotta","Carmel","Carmela","Carmella","Carmelo","Carmen","Carmine","Carol","Carolanne","Carole","Carolina","Caroline","Carolyn","Carolyne","Carrie","Carroll","Carson","Carter","Cary","Casandra","Casey","Casimer","Casimir","Casper","Cassandra","Cassandre","Cassidy","Cassie","Catalina","Caterina","Catharine","Catherine","Cathrine","Cathryn","Cathy","Cayla","Ceasar","Cecelia","Cecil","Cecile","Cecilia","Cedrick","Celestine","Celestino","Celia","Celine","Cesar","Chad","Chadd","Chadrick","Chaim","Chance","Chandler","Chanel","Chanelle","Charity","Charlene","Charles","Charley","Charlie","Charlotte","Chase","Chasity","Chauncey","Chaya","Chaz","Chelsea","Chelsey","Chelsie","Chesley","Chester","Chet","Cheyanne","Cheyenne","Chloe","Chris","Christ","Christa","Christelle","Christian","Christiana","Christina","Christine","Christop","Christophe","Christopher","Christy","Chyna","Ciara","Cicero","Cielo","Cierra","Cindy","Citlalli","Clair","Claire","Clara","Clarabelle","Clare","Clarissa","Clark","Claud","Claude","Claudia","Claudie","Claudine","Clay","Clemens","Clement","Clementina","Clementine","Clemmie","Cleo","Cleora","Cleta","Cletus","Cleve","Cleveland","Clifford","Clifton","Clint","Clinton","Clotilde","Clovis","Cloyd","Clyde","Coby","Cody","Colby","Cole","Coleman","Colin","Colleen","Collin","Colt","Colten","Colton","Columbus","Concepcion","Conner","Connie","Connor","Conor","Conrad","Constance","Constantin","Consuelo","Cooper","Cora","Coralie","Corbin","Cordelia","Cordell","Cordia","Cordie","Corene","Corine","Cornelius","Cornell","Corrine","Cortez","Cortney","Cory","Coty","Courtney","Coy","Craig","Crawford","Creola","Cristal","Cristian","Cristina","Cristobal","Cristopher","Cruz","Crystal","Crystel","Cullen","Curt","Curtis","Cydney","Cynthia","Cyril","Cyrus","Dagmar","Dahlia","Daija","Daisha","Daisy","Dakota","Dale","Dallas","Dallin","Dalton","Damaris","Dameon","Damian","Damien","Damion","Damon","Dan","Dana","Dandre","Dane","D'angelo","Dangelo","Danial","Daniela","Daniella","Danielle","Danika","Dannie","Danny","Dante","Danyka","Daphne","Daphnee","Daphney","Darby","Daren","Darian","Dariana","Darien","Dario","Darion","Darius","Darlene","Daron","Darrel","Darrell","Darren","Darrick","Darrin","Darrion","Darron","Darryl","Darwin","Daryl","Dashawn","Dasia","Dave","David","Davin","Davion","Davon","Davonte","Dawn","Dawson","Dax","Dayana","Dayna","Dayne","Dayton","Dean","Deangelo","Deanna","Deborah","Declan","Dedric","Dedrick","Dee","Deion","Deja","Dejah","Dejon","Dejuan","Delaney","Delbert","Delfina","Delia","Delilah","Dell","Della","Delmer","Delores","Delpha","Delphia","Delphine","Delta","Demarco","Demarcus","Demario","Demetris","Demetrius","Demond","Dena","Denis","Dennis","Deon","Deondre","Deontae","Deonte","Dereck","Derek","Derick","Deron","Derrick","Deshaun","Deshawn","Desiree","Desmond","Dessie","Destany","Destin","Destinee","Destiney","Destini","Destiny","Devan","Devante","Deven","Devin","Devon","Devonte","Devyn","Dewayne","Dewitt","Dexter","Diamond","Diana","Dianna","Diego","Dillan","Dillon","Dimitri","Dina","Dino","Dion","Dixie","Dock","Dolly","Dolores","Domenic","Domenica","Domenick","Domenico","Domingo","Dominic","Dominique","Don","Donald","Donato","Donavon","Donna","Donnell","Donnie","Donny","Dora","Dorcas","Dorian","Doris","Dorothea","Dorothy","Dorris","Dortha","Dorthy","Doug","Douglas","Dovie","Doyle","Drake","Drew","Duane","Dudley","Dulce","Duncan","Durward","Dustin","Dusty","Dwight","Dylan","Earl","Earlene","Earline","Earnest","Earnestine","Easter","Easton","Ebba","Ebony","Ed","Eda","Edd","Eddie","Eden","Edgar","Edgardo","Edison","Edmond","Edmund","Edna","Eduardo","Edward","Edwardo","Edwin","Edwina","Edyth","Edythe","Effie","Efrain","Efren","Eileen","Einar","Eino","Eladio","Elaina","Elbert","Elda","Eldon","Eldora","Eldred","Eldridge","Eleanora","Eleanore","Eleazar","Electa","Elena","Elenor","Elenora","Eleonore","Elfrieda","Eli","Elian","Eliane","Elias","Eliezer","Elijah","Elinor","Elinore","Elisa","Elisabeth","Elise","Eliseo","Elisha","Elissa","Eliza","Elizabeth","Ella","Ellen","Ellie","Elliot","Elliott","Ellis","Ellsworth","Elmer","Elmira","Elmo","Elmore","Elna","Elnora","Elody","Eloisa","Eloise","Elouise","Eloy","Elroy","Elsa","Else","Elsie","Elta","Elton","Elva","Elvera","Elvie","Elvis","Elwin","Elwyn","Elyse","Elyssa","Elza","Emanuel","Emelia","Emelie","Emely","Emerald","Emerson","Emery","Emie","Emil","Emile","Emilia","Emiliano","Emilie","Emilio","Emily","Emma","Emmalee","Emmanuel","Emmanuelle","Emmet","Emmett","Emmie","Emmitt","Emmy","Emory","Ena","Enid","Enoch","Enola","Enos","Enrico","Enrique","Ephraim","Era","Eriberto","Eric","Erica","Erich","Erick","Ericka","Erik","Erika","Erin","Erling","Erna","Ernest","Ernestina","Ernestine","Ernesto","Ernie","Ervin","Erwin","Eryn","Esmeralda","Esperanza","Esta","Esteban","Estefania","Estel","Estell","Estella","Estelle","Estevan","Esther","Estrella","Etha","Ethan","Ethel","Ethelyn","Ethyl","Ettie","Eudora","Eugene","Eugenia","Eula","Eulah","Eulalia","Euna","Eunice","Eusebio","Eva","Evalyn","Evan","Evangeline","Evans","Eve","Eveline","Evelyn","Everardo","Everett","Everette","Evert","Evie","Ewald","Ewell","Ezekiel","Ezequiel","Ezra","Fabian","Fabiola","Fae","Fannie","Fanny","Fatima","Faustino","Fausto","Favian","Fay","Faye","Federico","Felicia","Felicita","Felicity","Felipa","Felipe","Felix","Felton","Fermin","Fern","Fernando","Ferne","Fidel","Filiberto","Filomena","Finn","Fiona","Flavie","Flavio","Fleta","Fletcher","Flo","Florence","Florencio","Florian","Florida","Florine","Flossie","Floy","Floyd","Ford","Forest","Forrest","Foster","Frances","Francesca","Francesco","Francis","Francisca","Francisco","Franco","Frank","Frankie","Franz","Fred","Freda","Freddie","Freddy","Frederic","Frederick","Frederik","Frederique","Fredrick","Fredy","Freeda","Freeman","Freida","Frida","Frieda","Friedrich","Fritz","Furman","Gabe","Gabriel","Gabriella","Gabrielle","Gaetano","Gage","Gail","Gardner","Garett","Garfield","Garland","Garnet","Garnett","Garret","Garrett","Garrick","Garrison","Garry","Garth","Gaston","Gavin","Gay","Gayle","Gaylord","Gene","General","Genesis","Genevieve","Gennaro","Genoveva","Geo","Geoffrey","George","Georgette","Georgiana","Georgianna","Geovanni","Geovanny","Geovany","Gerald","Geraldine","Gerard","Gerardo","Gerda","Gerhard","Germaine","German","Gerry","Gerson","Gertrude","Gia","Gianni","Gideon","Gilbert","Gilberto","Gilda","Giles","Gillian","Gina","Gino","Giovani","Giovanna","Giovanni","Giovanny","Gisselle","Giuseppe","Gladyce","Gladys","Glen","Glenda","Glenna","Glennie","Gloria","Godfrey","Golda","Golden","Gonzalo","Gordon","Grace","Gracie","Graciela","Grady","Graham","Grant","Granville","Grayce","Grayson","Green","Greg","Gregg","Gregoria","Gregorio","Gregory","Greta","Gretchen","Greyson","Griffin","Grover","Guadalupe","Gudrun","Guido","Guillermo","Guiseppe","Gunnar","Gunner","Gus","Gussie","Gust","Gustave","Guy","Gwen","Gwendolyn","Hadley","Hailee","Hailey","Hailie","Hal","Haleigh","Haley","Halie","Halle","Hallie","Hank","Hanna","Hannah","Hans","Hardy","Harley","Harmon","Harmony","Harold","Harrison","Harry","Harvey","Haskell","Hassan","Hassie","Hattie","Haven","Hayden","Haylee","Hayley","Haylie","Hazel","Hazle","Heath","Heather","Heaven","Heber","Hector","Heidi","Helen","Helena","Helene","Helga","Hellen","Helmer","Heloise","Henderson","Henri","Henriette","Henry","Herbert","Herman","Hermann","Hermina","Herminia","Herminio","Hershel","Herta","Hertha","Hester","Hettie","Hilario","Hilbert","Hilda","Hildegard","Hillard","Hillary","Hilma","Hilton","Hipolito","Hiram","Hobart","Holden","Hollie","Hollis","Holly","Hope","Horace","Horacio","Hortense","Hosea","Houston","Howard","Howell","Hoyt","Hubert","Hudson","Hugh","Hulda","Humberto","Hunter","Hyman","Ian","Ibrahim","Icie","Ida","Idell","Idella","Ignacio","Ignatius","Ike","Ila","Ilene","Iliana","Ima","Imani","Imelda","Immanuel","Imogene","Ines","Irma","Irving","Irwin","Isaac","Isabel","Isabell","Isabella","Isabelle","Isac","Isadore","Isai","Isaiah","Isaias","Isidro","Ismael","Isobel","Isom","Israel","Issac","Itzel","Iva","Ivah","Ivory","Ivy","Izabella","Izaiah","Jabari","Jace","Jacey","Jacinthe","Jacinto","Jack","Jackeline","Jackie","Jacklyn","Jackson","Jacky","Jaclyn","Jacquelyn","Jacques","Jacynthe","Jada","Jade","Jaden","Jadon","Jadyn","Jaeden","Jaida","Jaiden","Jailyn","Jaime","Jairo","Jakayla","Jake","Jakob","Jaleel","Jalen","Jalon","Jalyn","Jamaal","Jamal","Jamar","Jamarcus","Jamel","Jameson","Jamey","Jamie","Jamil","Jamir","Jamison","Jammie","Jan","Jana","Janae","Jane","Janelle","Janessa","Janet","Janice","Janick","Janie","Janis","Janiya","Jannie","Jany","Jaquan","Jaquelin","Jaqueline","Jared","Jaren","Jarod","Jaron","Jarred","Jarrell","Jarret","Jarrett","Jarrod","Jarvis","Jasen","Jasmin","Jason","Jasper","Jaunita","Javier","Javon","Javonte","Jay","Jayce","Jaycee","Jayda","Jayde","Jayden","Jaydon","Jaylan","Jaylen","Jaylin","Jaylon","Jayme","Jayne","Jayson","Jazlyn","Jazmin","Jazmyn","Jazmyne","Jean","Jeanette","Jeanie","Jeanne","Jed","Jedediah","Jedidiah","Jeff","Jefferey","Jeffery","Jeffrey","Jeffry","Jena","Jenifer","Jennie","Jennifer","Jennings","Jennyfer","Jensen","Jerad","Jerald","Jeramie","Jeramy","Jerel","Jeremie","Jeremy","Jermain","Jermaine","Jermey","Jerod","Jerome","Jeromy","Jerrell","Jerrod","Jerrold","Jerry","Jess","Jesse","Jessica","Jessie","Jessika","Jessy","Jessyca","Jesus","Jett","Jettie","Jevon","Jewel","Jewell","Jillian","Jimmie","Jimmy","Jo","Joan","Joana","Joanie","Joanne","Joannie","Joanny","Joany","Joaquin","Jocelyn","Jodie","Jody","Joe","Joel","Joelle","Joesph","Joey","Johan","Johann","Johanna","Johathan","John","Johnathan","Johnathon","Johnnie","Johnny","Johnpaul","Johnson","Jolie","Jon","Jonas","Jonatan","Jonathan","Jonathon","Jordan","Jordane","Jordi","Jordon","Jordy","Jordyn","Jorge","Jose","Josefa","Josefina","Joseph","Josephine","Josh","Joshua","Joshuah","Josiah","Josiane","Josianne","Josie","Josue","Jovan","Jovani","Jovanny","Jovany","Joy","Joyce","Juana","Juanita","Judah","Judd","Jude","Judge","Judson","Judy","Jules","Julia","Julian","Juliana","Julianne","Julie","Julien","Juliet","Julio","Julius","June","Junior","Junius","Justen","Justice","Justina","Justine","Juston","Justus","Justyn","Juvenal","Juwan","Kacey","Kaci","Kacie","Kade","Kaden","Kadin","Kaela","Kaelyn","Kaia","Kailee","Kailey","Kailyn","Kaitlin","Kaitlyn","Kale","Kaleb","Kaleigh","Kaley","Kali","Kallie","Kameron","Kamille","Kamren","Kamron","Kamryn","Kane","Kara","Kareem","Karelle","Karen","Kari","Kariane","Karianne","Karina","Karine","Karl","Karlee","Karley","Karli","Karlie","Karolann","Karson","Kasandra","Kasey","Kassandra","Katarina","Katelin","Katelyn","Katelynn","Katharina","Katherine","Katheryn","Kathleen","Kathlyn","Kathryn","Kathryne","Katlyn","Katlynn","Katrina","Katrine","Kattie","Kavon","Kay","Kaya","Kaycee","Kayden","Kayla","Kaylah","Kaylee","Kayleigh","Kayley","Kayli","Kaylie","Kaylin","Keagan","Keanu","Keara","Keaton","Keegan","Keeley","Keely","Keenan","Keira","Keith","Kellen","Kelley","Kelli","Kellie","Kelly","Kelsi","Kelsie","Kelton","Kelvin","Ken","Kendall","Kendra","Kendrick","Kenna","Kennedi","Kennedy","Kenneth","Kennith","Kenny","Kenton","Kenya","Kenyatta","Kenyon","Keon","Keshaun","Keshawn","Keven","Kevin","Kevon","Keyon","Keyshawn","Khalid","Khalil","Kian","Kiana","Kianna","Kiara","Kiarra","Kiel","Kiera","Kieran","Kiley","Kim","Kimberly","King","Kip","Kira","Kirk","Kirsten","Kirstin","Kitty","Kobe","Koby","Kody","Kolby","Kole","Korbin","Korey","Kory","Kraig","Kris","Krista","Kristian","Kristin","Kristina","Kristofer","Kristoffer","Kristopher","Kristy","Krystal","Krystel","Krystina","Kurt","Kurtis","Kyla","Kyle","Kylee","Kyleigh","Kyler","Kylie","Kyra","Lacey","Lacy","Ladarius","Lafayette","Laila","Laisha","Lamar","Lambert","Lamont","Lance","Landen","Lane","Laney","Larissa","Laron","Larry","Larue","Laura","Laurel","Lauren","Laurence","Lauretta","Lauriane","Laurianne","Laurie","Laurine","Laury","Lauryn","Lavada","Lavern","Laverna","Laverne","Lavina","Lavinia","Lavon","Lavonne","Lawrence","Lawson","Layla","Layne","Lazaro","Lea","Leann","Leanna","Leanne","Leatha","Leda","Lee","Leif","Leila","Leilani","Lela","Lelah","Leland","Lelia","Lempi","Lemuel","Lenna","Lennie","Lenny","Lenora","Lenore","Leo","Leola","Leon","Leonard","Leonardo","Leone","Leonel","Leonie","Leonor","Leonora","Leopold","Leopoldo","Leora","Lera","Lesley","Leslie","Lesly","Lessie","Lester","Leta","Letha","Letitia","Levi","Lew","Lewis","Lexi","Lexie","Lexus","Lia","Liam","Liana","Libbie","Libby","Lila","Lilian","Liliana","Liliane","Lilla","Lillian","Lilliana","Lillie","Lilly","Lily","Lilyan","Lina","Lincoln","Linda","Lindsay","Lindsey","Linnea","Linnie","Linwood","Lionel","Lisa","Lisandro","Lisette","Litzy","Liza","Lizeth","Lizzie","Llewellyn","Lloyd","Logan","Lois","Lola","Lolita","Loma","Lon","London","Lonie","Lonnie","Lonny","Lonzo","Lora","Loraine","Loren","Lorena","Lorenz","Lorenza","Lorenzo","Lori","Lorine","Lorna","Lottie","Lou","Louie","Louisa","Lourdes","Louvenia","Lowell","Loy","Loyal","Loyce","Lucas","Luciano","Lucie","Lucienne","Lucile","Lucinda","Lucio","Lucious","Lucius","Lucy","Ludie","Ludwig","Lue","Luella","Luigi","Luis","Luisa","Lukas","Lula","Lulu","Luna","Lupe","Lura","Lurline","Luther","Luz","Lyda","Lydia","Lyla","Lynn","Lyric","Lysanne","Mabel","Mabelle","Mable","Mac","Macey","Maci","Macie","Mack","Mackenzie","Macy","Madaline","Madalyn","Maddison","Madeline","Madelyn","Madelynn","Madge","Madie","Madilyn","Madisen","Madison","Madisyn","Madonna","Madyson","Mae","Maegan","Maeve","Mafalda","Magali","Magdalen","Magdalena","Maggie","Magnolia","Magnus","Maia","Maida","Maiya","Major","Makayla","Makenna","Makenzie","Malachi","Malcolm","Malika","Malinda","Mallie","Mallory","Malvina","Mandy","Manley","Manuel","Manuela","Mara","Marc","Marcel","Marcelina","Marcelino","Marcella","Marcelle","Marcellus","Marcelo","Marcia","Marco","Marcos","Marcus","Margaret","Margarete","Margarett","Margaretta","Margarette","Margarita","Marge","Margie","Margot","Margret","Marguerite","Maria","Mariah","Mariam","Marian","Mariana","Mariane","Marianna","Marianne","Mariano","Maribel","Marie","Mariela","Marielle","Marietta","Marilie","Marilou","Marilyne","Marina","Mario","Marion","Marisa","Marisol","Maritza","Marjolaine","Marjorie","Marjory","Mark","Markus","Marlee","Marlen","Marlene","Marley","Marlin","Marlon","Marques","Marquis","Marquise","Marshall","Marta","Martin","Martina","Martine","Marty","Marvin","Mary","Maryam","Maryjane","Maryse","Mason","Mateo","Mathew","Mathias","Mathilde","Matilda","Matilde","Matt","Matteo","Mattie","Maud","Maude","Maudie","Maureen","Maurice","Mauricio","Maurine","Maverick","Mavis","Max","Maxie","Maxime","Maximilian","Maximillia","Maximillian","Maximo","Maximus","Maxine","Maxwell","May","Maya","Maybell","Maybelle","Maye","Maymie","Maynard","Mayra","Mazie","Mckayla","Mckenna","Mckenzie","Meagan","Meaghan","Meda","Megane","Meggie","Meghan","Mekhi","Melany","Melba","Melisa","Melissa","Mellie","Melody","Melvin","Melvina","Melyna","Melyssa","Mercedes","Meredith","Merl","Merle","Merlin","Merritt","Mertie","Mervin","Meta","Mia","Micaela","Micah","Michael","Michaela","Michale","Micheal","Michel","Michele","Michelle","Miguel","Mikayla","Mike","Mikel","Milan","Miles","Milford","Miller","Millie","Milo","Milton","Mina","Minerva","Minnie","Miracle","Mireille","Mireya","Misael","Missouri","Misty","Mitchel","Mitchell","Mittie","Modesta","Modesto","Mohamed","Mohammad","Mohammed","Moises","Mollie","Molly","Mona","Monica","Monique","Monroe","Monserrat","Monserrate","Montana","Monte","Monty","Morgan","Moriah","Morris","Mortimer","Morton","Mose","Moses","Moshe","Mossie","Mozell","Mozelle","Muhammad","Muriel","Murl","Murphy","Murray","Mustafa","Mya","Myah","Mylene","Myles","Myra","Myriam","Myrl","Myrna","Myron","Myrtice","Myrtie","Myrtis","Myrtle","Nadia","Nakia","Name","Nannie","Naomi","Naomie","Napoleon","Narciso","Nash","Nasir","Nat","Natalia","Natalie","Natasha","Nathan","Nathanael","Nathanial","Nathaniel","Nathen","Nayeli","Neal","Ned","Nedra","Neha","Neil","Nelda","Nella","Nelle","Nellie","Nels","Nelson","Neoma","Nestor","Nettie","Neva","Newell","Newton","Nia","Nicholas","Nicholaus","Nichole","Nick","Nicklaus","Nickolas","Nico","Nicola","Nicolas","Nicole","Nicolette","Nigel","Nikita","Nikki","Nikko","Niko","Nikolas","Nils","Nina","Noah","Noble","Noe","Noel","Noelia","Noemi","Noemie","Noemy","Nola","Nolan","Nona","Nora","Norbert","Norberto","Norene","Norma","Norris","Norval","Norwood","Nova","Novella","Nya","Nyah","Nyasia","Obie","Oceane","Ocie","Octavia","Oda","Odell","Odessa","Odie","Ofelia","Okey","Ola","Olaf","Ole","Olen","Oleta","Olga","Olin","Oliver","Ollie","Oma","Omari","Omer","Ona","Onie","Opal","Ophelia","Ora","Oral","Oran","Oren","Orie","Orin","Orion","Orland","Orlando","Orlo","Orpha","Orrin","Orval","Orville","Osbaldo","Osborne","Oscar","Osvaldo","Oswald","Oswaldo","Otha","Otho","Otilia","Otis","Ottilie","Ottis","Otto","Ova","Owen","Ozella","Pablo","Paige","Palma","Pamela","Pansy","Paolo","Paris","Parker","Pascale","Pasquale","Pat","Patience","Patricia","Patrick","Patsy","Pattie","Paul","Paula","Pauline","Paxton","Payton","Pearl","Pearlie","Pearline","Pedro","Peggie","Penelope","Percival","Percy","Perry","Pete","Peter","Petra","Peyton","Philip","Phoebe","Phyllis","Pierce","Pierre","Pietro","Pink","Pinkie","Piper","Polly","Porter","Precious","Presley","Preston","Price","Prince","Princess","Priscilla","Providenci","Prudence","Queen","Queenie","Quentin","Quincy","Quinn","Quinten","Quinton","Rachael","Rachel","Rachelle","Rae","Raegan","Rafael","Rafaela","Raheem","Rahsaan","Rahul","Raina","Raleigh","Ralph","Ramiro","Ramon","Ramona","Randal","Randall","Randi","Randy","Ransom","Raoul","Raphael","Raphaelle","Raquel","Rashad","Rashawn","Rasheed","Raul","Raven","Ray","Raymond","Raymundo","Reagan","Reanna","Reba","Rebeca","Rebecca","Rebeka","Rebekah","Reece","Reed","Reese","Regan","Reggie","Reginald","Reid","Reilly","Reina","Reinhold","Remington","Rene","Renee","Ressie","Reta","Retha","Retta","Reuben","Reva","Rex","Rey","Reyes","Reymundo","Reyna","Reynold","Rhea","Rhett","Rhianna","Rhiannon","Rhoda","Ricardo","Richard","Richie","Richmond","Rick","Rickey","Rickie","Ricky","Rico","Rigoberto","Riley","Rita","River","Robb","Robbie","Robert","Roberta","Roberto","Robin","Robyn","Rocio","Rocky","Rod","Roderick","Rodger","Rodolfo","Rodrick","Rodrigo","Roel","Rogelio","Roger","Rogers","Rolando","Rollin","Roma","Romaine","Roman","Ron","Ronaldo","Ronny","Roosevelt","Rory","Rosa","Rosalee","Rosalia","Rosalind","Rosalinda","Rosalyn","Rosamond","Rosanna","Rosario","Roscoe","Rose","Rosella","Roselyn","Rosemarie","Rosemary","Rosendo","Rosetta","Rosie","Rosina","Roslyn","Ross","Rossie","Rowan","Rowena","Rowland","Roxane","Roxanne","Roy","Royal","Royce","Rozella","Ruben","Rubie","Ruby","Rubye","Rudolph","Rudy","Rupert","Russ","Russel","Russell","Rusty","Ruth","Ruthe","Ruthie","Ryan","Ryann","Ryder","Rylan","Rylee","Ryleigh","Ryley","Sabina","Sabrina","Sabryna","Sadie","Sadye","Sage","Saige","Sallie","Sally","Salma","Salvador","Salvatore","Sam","Samanta","Samantha","Samara","Samir","Sammie","Sammy","Samson","Sandra","Sandrine","Sandy","Sanford","Santa","Santiago","Santina","Santino","Santos","Sarah","Sarai","Sarina","Sasha","Saul","Savanah","Savanna","Savannah","Savion","Scarlett","Schuyler","Scot","Scottie","Scotty","Seamus","Sean","Sebastian","Sedrick","Selena","Selina","Selmer","Serena","Serenity","Seth","Shad","Shaina","Shakira","Shana","Shane","Shanel","Shanelle","Shania","Shanie","Shaniya","Shanna","Shannon","Shanny","Shanon","Shany","Sharon","Shaun","Shawn","Shawna","Shaylee","Shayna","Shayne","Shea","Sheila","Sheldon","Shemar","Sheridan","Sherman","Sherwood","Shirley","Shyann","Shyanne","Sibyl","Sid","Sidney","Sienna","Sierra","Sigmund","Sigrid","Sigurd","Silas","Sim","Simeon","Simone","Sincere","Sister","Skye","Skyla","Skylar","Sofia","Soledad","Solon","Sonia","Sonny","Sonya","Sophia","Sophie","Spencer","Stacey","Stacy","Stan","Stanford","Stanley","Stanton","Stefan","Stefanie","Stella","Stephan","Stephania","Stephanie","Stephany","Stephen","Stephon","Sterling","Steve","Stevie","Stewart","Stone","Stuart","Summer","Sunny","Susan","Susana","Susanna","Susie","Suzanne","Sven","Syble","Sydnee","Sydney","Sydni","Sydnie","Sylvan","Sylvester","Sylvia","Tabitha","Tad","Talia","Talon","Tamara","Tamia","Tania","Tanner","Tanya","Tara","Taryn","Tate","Tatum","Tatyana","Taurean","Tavares","Taya","Taylor","Teagan","Ted","Telly","Terence","Teresa","Terrance","Terrell","Terrence","Terrill","Terry","Tess","Tessie","Tevin","Thad","Thaddeus","Thalia","Thea","Thelma","Theo","Theodora","Theodore","Theresa","Therese","Theresia","Theron","Thomas","Thora","Thurman","Tia","Tiana","Tianna","Tiara","Tierra","Tiffany","Tillman","Timmothy","Timmy","Timothy","Tina","Tito","Titus","Tobin","Toby","Tod","Tom","Tomas","Tomasa","Tommie","Toney","Toni","Tony","Torey","Torrance","Torrey","Toy","Trace","Tracey","Tracy","Travis","Travon","Tre","Tremaine","Tremayne","Trent","Trenton","Tressa","Tressie","Treva","Trever","Trevion","Trevor","Trey","Trinity","Trisha","Tristian","Tristin","Triston","Troy","Trudie","Trycia","Trystan","Turner","Twila","Tyler","Tyra","Tyree","Tyreek","Tyrel","Tyrell","Tyrese","Tyrique","Tyshawn","Tyson","Ubaldo","Ulices","Ulises","Una","Unique","Urban","Uriah","Uriel","Ursula","Vada","Valentin","Valentina","Valentine","Valerie","Vallie","Van","Vance","Vanessa","Vaughn","Veda","Velda","Vella","Velma","Velva","Vena","Verda","Verdie","Vergie","Verla","Verlie","Vern","Verna","Verner","Vernice","Vernie","Vernon","Verona","Veronica","Vesta","Vicenta","Vicente","Vickie","Vicky","Victor","Victoria","Vida","Vidal","Vilma","Vince","Vincent","Vincenza","Vincenzo","Vinnie","Viola","Violet","Violette","Virgie","Virgil","Virginia","Virginie","Vita","Vito","Viva","Vivian","Viviane","Vivianne","Vivien","Vivienne","Vladimir","Wade","Waino","Waldo","Walker","Wallace","Walter","Walton","Wanda","Ward","Warren","Watson","Wava","Waylon","Wayne","Webster","Weldon","Wellington","Wendell","Wendy","Werner","Westley","Weston","Whitney","Wilber","Wilbert","Wilburn","Wiley","Wilford","Wilfred","Wilfredo","Wilfrid","Wilhelm","Wilhelmine","Will","Willa","Willard","William","Willie","Willis","Willow","Willy","Wilma","Wilmer","Wilson","Wilton","Winfield","Winifred","Winnifred","Winona","Winston","Woodrow","Wyatt","Wyman","Xander","Xavier","Xzavier","Yadira","Yasmeen","Yasmin","Yasmine","Yazmin","Yesenia","Yessenia","Yolanda","Yoshiko","Yvette","Yvonne","Zachariah","Zachary","Zachery","Zack","Zackary","Zackery","Zakary","Zander","Zane","Zaria","Zechariah","Zelda","Zella","Zelma","Zena","Zetta","Zion","Zita","Zoe","Zoey","Zoie","Zoila","Zola","Zora","Zula"],
      "last_name": ["Abbott","Abernathy","Abshire","Adams","Altenwerth","Anderson","Ankunding","Armstrong","Auer","Aufderhar","Bahringer","Bailey","Balistreri","Barrows","Bartell","Bartoletti","Barton","Bashirian","Batz","Bauch","Baumbach","Bayer","Beahan","Beatty","Bechtelar","Becker","Bednar","Beer","Beier","Berge","Bergnaum","Bergstrom","Bernhard","Bernier","Bins","Blanda","Blick","Block","Bode","Boehm","Bogan","Bogisich","Borer","Bosco","Botsford","Boyer","Boyle","Bradtke","Brakus","Braun","Breitenberg","Brekke","Brown","Bruen","Buckridge","Carroll","Carter","Cartwright","Casper","Cassin","Champlin","Christiansen","Cole","Collier","Collins","Conn","Connelly","Conroy","Considine","Corkery","Cormier","Corwin","Cremin","Crist","Crona","Cronin","Crooks","Cruickshank","Cummerata","Cummings","Dach","D'Amore","Daniel","Dare","Daugherty","Davis","Deckow","Denesik","Dibbert","Dickens","Dicki","Dickinson","Dietrich","Donnelly","Dooley","Douglas","Doyle","DuBuque","Durgan","Ebert","Effertz","Eichmann","Emard","Emmerich","Erdman","Ernser","Fadel","Fahey","Farrell","Fay","Feeney","Feest","Feil","Ferry","Fisher","Flatley","Frami","Franecki","Friesen","Fritsch","Funk","Gaylord","Gerhold","Gerlach","Gibson","Gislason","Gleason","Gleichner","Glover","Goldner","Goodwin","Gorczany","Gottlieb","Goyette","Grady","Graham","Grant","Green","Greenfelder","Greenholt","Grimes","Gulgowski","Gusikowski","Gutkowski","Gutmann","Haag","Hackett","Hagenes","Hahn","Haley","Halvorson","Hamill","Hammes","Hand","Hane","Hansen","Harber","Harris","Hartmann","Harvey","Hauck","Hayes","Heaney","Heathcote","Hegmann","Heidenreich","Heller","Herman","Hermann","Hermiston","Herzog","Hessel","Hettinger","Hickle","Hilll","Hills","Hilpert","Hintz","Hirthe","Hodkiewicz","Hoeger","Homenick","Hoppe","Howe","Howell","Hudson","Huel","Huels","Hyatt","Jacobi","Jacobs","Jacobson","Jakubowski","Jaskolski","Jast","Jenkins","Jerde","Johns","Johnson","Johnston","Jones","Kassulke","Kautzer","Keebler","Keeling","Kemmer","Kerluke","Kertzmann","Kessler","Kiehn","Kihn","Kilback","King","Kirlin","Klein","Kling","Klocko","Koch","Koelpin","Koepp","Kohler","Konopelski","Koss","Kovacek","Kozey","Krajcik","Kreiger","Kris","Kshlerin","Kub","Kuhic","Kuhlman","Kuhn","Kulas","Kunde","Kunze","Kuphal","Kutch","Kuvalis","Labadie","Lakin","Lang","Langosh","Langworth","Larkin","Larson","Leannon","Lebsack","Ledner","Leffler","Legros","Lehner","Lemke","Lesch","Leuschke","Lind","Lindgren","Littel","Little","Lockman","Lowe","Lubowitz","Lueilwitz","Luettgen","Lynch","Macejkovic","MacGyver","Maggio","Mann","Mante","Marks","Marquardt","Marvin","Mayer","Mayert","McClure","McCullough","McDermott","McGlynn","McKenzie","McLaughlin","Medhurst","Mertz","Metz","Miller","Mills","Mitchell","Moen","Mohr","Monahan","Moore","Morar","Morissette","Mosciski","Mraz","Mueller","Muller","Murazik","Murphy","Murray","Nader","Nicolas","Nienow","Nikolaus","Nitzsche","Nolan","Oberbrunner","O'Connell","O'Conner","O'Hara","O'Keefe","O'Kon","Okuneva","Olson","Ondricka","O'Reilly","Orn","Ortiz","Osinski","Pacocha","Padberg","Pagac","Parisian","Parker","Paucek","Pfannerstill","Pfeffer","Pollich","Pouros","Powlowski","Predovic","Price","Prohaska","Prosacco","Purdy","Quigley","Quitzon","Rath","Ratke","Rau","Raynor","Reichel","Reichert","Reilly","Reinger","Rempel","Renner","Reynolds","Rice","Rippin","Ritchie","Robel","Roberts","Rodriguez","Rogahn","Rohan","Rolfson","Romaguera","Roob","Rosenbaum","Rowe","Ruecker","Runolfsdottir","Runolfsson","Runte","Russel","Rutherford","Ryan","Sanford","Satterfield","Sauer","Sawayn","Schaden","Schaefer","Schamberger","Schiller","Schimmel","Schinner","Schmeler","Schmidt","Schmitt","Schneider","Schoen","Schowalter","Schroeder","Schulist","Schultz","Schumm","Schuppe","Schuster","Senger","Shanahan","Shields","Simonis","Sipes","Skiles","Smith","Smitham","Spencer","Spinka","Sporer","Stamm","Stanton","Stark","Stehr","Steuber","Stiedemann","Stokes","Stoltenberg","Stracke","Streich","Stroman","Strosin","Swaniawski","Swift","Terry","Thiel","Thompson","Tillman","Torp","Torphy","Towne","Toy","Trantow","Tremblay","Treutel","Tromp","Turcotte","Turner","Ullrich","Upton","Vandervort","Veum","Volkman","Von","VonRueden","Waelchi","Walker","Walsh","Walter","Ward","Waters","Watsica","Weber","Wehner","Weimann","Weissnat","Welch","West","White","Wiegand","Wilderman","Wilkinson","Will","Williamson","Willms","Windler","Wintheiser","Wisoky","Wisozk","Witting","Wiza","Wolf","Wolff","Wuckert","Wunsch","Wyman","Yost","Yundt","Zboncak","Zemlak","Ziemann","Zieme","Zulauf"]
    };

    var icons = [
      "md-menu", "md-arrow-drop-down", "md-flag", "md-home", "md-warning", "md-play-circle-fill",
      "md-forum", "md-content-paste", "md-battery-80", "md-format-textdirection-l-to-r", "md-folder-open",
      "md-desktop-windows", "md-collections", "md-directions-bike", "md-apps", "md-phone-in-talk", "md-people",
      "md-star-half", "md-arrow-drop-down", "md-file-download md-lg", "md-3d-rotation", "md-accessibility",
      "md-account-balance", "md-account-balance-wallet", "md-account-box", "md-account-child", "md-account-circle",
      "md-add-shopping-cart", "md-alarm", "md-alarm-add", "md-alarm-off", "md-alarm-on", "md-android", "md-announcement",
      "md-aspect-ratio", "md-assessment", "md-assignment", "md-assignment-ind", "md-assignment-late", "md-assignment-return",
      "md-assignment-returned", "md-assignment-turned-in", "md-autorenew", "md-backup", "md-book", "md-bookmark",
      "md-bookmark-outline", "md-bug-report", "md-cached", "md-class", "md-credit-card", "md-dashboard", "md-delete",
      "md-description", "md-dns", "md-done", "md-done-all", "md-event", "md-exit-to-app", "md-explore", "md-extension",
      "md-face-unlock", "md-favorite", "md-favorite-outline", "md-find-in-page", "md-find-replace", "md-flip-to-back",
      "md-flip-to-front", "md-get-app", "md-grade", "md-group-work", "md-help", "md-highlight-remove", "md-history",
      "md-home", "md-https", "md-info", "md-info-outline", "md-input", "md-invert-colors", "md-label", "md-label-outline",
      "md-language", "md-launch", "md-list", "md-lock", "md-lock-open", "md-lock-outline", "md-loyalty", "md-markunread-mailbox",
      "md-note-add", "md-open-in-browser", "md-open-in-new", "md-open-with", "md-pageview", "md-payment", "md-perm-camera-mic",
      "md-perm-contact-cal", "md-perm-data-setting", "md-perm-device-info", "md-perm-identity", "md-perm-media", "md-perm-phone-msg",
      "md-perm-scan-wifi", "md-picture-in-picture", "md-polymer", "md-print", "md-query-builder", "md-question-answer", "md-receipt",
      "md-redeem", "md-report-problem", "md-restore", "md-room", "md-schedule", "md-search", "md-settings", "md-settings-applications",
      "md-settings-backup-restore", "md-settings-bluetooth", "md-settings-cell", "md-settings-display", "md-settings-ethernet",
      "md-settings-input-antenna", "md-settings-input-component", "md-settings-input-composite", "md-settings-input-hdmi",
      "md-settings-input-svideo", "md-settings-overscan", "md-settings-phone", "md-settings-power", "md-settings-remote",
      "md-settings-voice", "md-shop", "md-shopping-basket", "md-shopping-cart", "md-shop-two", "md-speaker-notes",
      "md-spellcheck", "md-star-rate", "md-stars", "md-store", "md-subject", "md-swap-horiz", "md-swap-vert",
      "md-swap-vert-circle", "md-system-update-tv", "md-tab", "md-tab-unselected", "md-theaters", "md-thumb-down",
      "md-thumbs-up-down", "md-thumb-up", "md-toc", "md-today", "md-track-changes", "md-translate", "md-trending-down",
      "md-trending-neutral", "md-trending-up", "md-turned-in", "md-turned-in-not", "md-verified-user", "md-view-agenda",
      "md-view-array", "md-view-carousel", "md-view-column", "md-view-day", "md-view-headline", "md-view-list", "md-view-module",
      "md-view-quilt", "md-view-stream", "md-view-week", "md-visibility", "md-visibility-off", "md-wallet-giftcard", "md-wallet-membership",
      "md-wallet-travel", "md-work", "md-error", "md-warning", "md-album", "md-av-timer", "md-closed-caption", "md-equalizer", "md-explicit",
      "md-fast-forward", "md-fast-rewind", "md-games", "md-hearing", "md-high-quality", "md-loop", "md-mic", "md-mic-none",
      "md-mic-off", "md-movie", "md-my-library-add", "md-my-library-books", "md-my-library-music", "md-new-releases", "md-not-interested",
      "md-pause", "md-pause-circle-fill", "md-pause-circle-outline", "md-play-arrow", "md-play-circle-fill",
      "md-play-circle-outline", "md-playlist-add", "md-play-shopping-bag", "md-queue", "md-queue-music", "md-radio",
      "md-recent-actors", "md-repeat", "md-repeat-one", "md-replay", "md-shuffle", "md-skip-next", "md-skip-previous",
      "md-snooze", "md-stop", "md-subtitles", "md-surround-sound", "md-videocam", "md-videocam-off", "md-video-collection",
      "md-volume-down", "md-volume-mute", "md-volume-off", "md-volume-up", "md-web", "md-business", "md-call", "md-call-end",
      "md-call-made", "md-call-merge", "md-call-missed", "md-call-received", "md-call-split", "md-chat", "md-clear-all",
      "md-comment", "md-contacts", "md-dialer-sip", "md-dialpad", "md-dnd-on", "md-email", "md-forum", "md-import-export",
      "md-invert-colors-off", "md-invert-colors-on", "md-live-help", "md-location-off", "md-location-on", "md-message",
      "md-messenger", "md-no-sim", "md-phone", "md-portable-wifi-off", "md-quick-contacts-dialer", "md-quick-contacts-mail",
      "md-ring-volume", "md-stay-current-landscape", "md-stay-current-portrait", "md-stay-primary-landscape",
      "md-stay-primary-portrait", "md-swap-calls", "md-textsms", "md-voicemail", "md-vpn-key", "md-add", "md-add-box",
      "md-add-circle", "md-add-circle-outline", "md-archive", "md-backspace", "md-block", "md-clear", "md-content-copy",
      "md-content-cut", "md-content-paste", "md-create", "md-drafts", "md-filter-list", "md-flag", "md-forward",
      "md-gesture", "md-inbox", "md-link", "md-mail", "md-markunread", "md-redo", "md-remove", "md-remove-circle",
      "md-remove-circle-outline", "md-reply", "md-reply-all", "md-report", "md-save", "md-select-all", "md-send",
      "md-sort", "md-text-format", "md-undo", "md-access-alarm", "md-access-alarms", "md-access-time", "md-add-alarm",
      "md-airplanemode-off", "md-airplanemode-on", "md-battery-20", "md-battery-30", "md-battery-50", "md-battery-60",
      "md-battery-80", "md-battery-90", "md-battery-alert", "md-battery-charging-20", "md-battery-charging-30",
      "md-battery-charging-50", "md-battery-charging-60", "md-battery-charging-80", "md-battery-charging-90",
      "md-battery-charging-full", "md-battery-full", "md-battery-std", "md-battery-unknown", "md-bluetooth",
      "md-bluetooth-connected", "md-bluetooth-disabled", "md-bluetooth-searching", "md-brightness-auto", "md-brightness-high",
      "md-brightness-low", "md-brightness-medium", "md-data-usage", "md-developer-mode", "md-devices", "md-dvr",
      "md-gps-fixed", "md-gps-not-fixed", "md-gps-off", "md-location-disabled", "md-location-searching",
      "md-multitrack-audio", "md-network-cell", "md-network-wifi", "md-nfc", "md-now-wallpaper", "md-now-widgets",
      "md-screen-lock-landscape", "md-screen-lock-portrait", "md-screen-lock-rotation", "md-screen-rotation", "md-sd-storage",
      "md-settings-system-daydream", "md-signal-cellular-0-bar", "md-signal-cellular-1-bar", "md-signal-cellular-2-bar",
      "md-signal-cellular-3-bar", "md-signal-cellular-4-bar", "md-signal-cellular-connected-no-internet-0-bar",
      "md-signal-cellular-connected-no-internet-1-bar", "md-signal-cellular-connected-no-internet-2-bar",
      "md-signal-cellular-connected-no-internet-3-bar", "md-signal-cellular-connected-no-internet-4-bar",
      "md-signal-cellular-no-sim", "md-signal-cellular-null", "md-signal-cellular-off", "md-signal-wifi-0-bar",
      "md-signal-wifi-1-bar", "md-signal-wifi-2-bar", "md-signal-wifi-3-bar", "md-signal-wifi-4-bar", "md-signal-wifi-off",
      "md-storage", "md-usb", "md-wifi-lock", "md-wifi-tethering", "md-attach-file", "md-attach-money", "md-border-all",
      "md-border-bottom", "md-border-clear", "md-border-color", "md-border-horizontal", "md-border-inner", "md-border-left",
      "md-border-outer", "md-border-right", "md-border-style", "md-border-top", "md-border-vertical", "md-format-align-center",
      "md-format-align-justify", "md-format-align-left", "md-format-align-right", "md-format-bold", "md-format-clear",
      "md-format-color-fill", "md-format-color-reset", "md-format-color-text", "md-format-indent-decrease",
      "md-format-indent-increase", "md-format-italic", "md-format-line-spacing", "md-format-list-bulleted",
      "md-format-list-numbered", "md-format-paint", "md-format-quote", "md-format-size", "md-format-strikethrough",
      "md-format-textdirection-l-to-r", "md-format-textdirection-r-to-l", "md-format-underline", "md-functions",
      "md-insert-chart", "md-insert-comment", "md-insert-drive-file", "md-insert-emoticon", "md-insert-invitation",
      "md-insert-link", "md-insert-photo", "md-merge-type", "md-mode-comment", "md-mode-edit", "md-publish",
      "md-vertical-align-bottom", "md-vertical-align-center", "md-vertical-align-top", "md-wrap-text", "md-attachment",
      "md-cloud", "md-cloud-circle", "md-cloud-done", "md-cloud-download", "md-cloud-off", "md-cloud-queue",
      "md-cloud-upload", "md-file-download", "md-file-upload", "md-folder", "md-folder-open", "md-folder-shared",
      "md-cast", "md-cast-connected", "md-computer", "md-desktop-mac", "md-desktop-windows", "md-dock", "md-gamepad",
      "md-headset", "md-headset-mic", "md-keyboard", "md-keyboard-alt", "md-keyboard-arrow-down", "md-keyboard-arrow-left",
      "md-keyboard-arrow-right", "md-keyboard-arrow-up", "md-keyboard-backspace", "md-keyboard-capslock",
      "md-keyboard-control", "md-keyboard-hide", "md-keyboard-return", "md-keyboard-tab", "md-keyboard-voice",
      "md-laptop", "md-laptop-chromebook", "md-laptop-mac", "md-laptop-windows", "md-memory", "md-mouse",
      "md-phone-android", "md-phone-iphone", "md-phonelink", "md-phonelink-off", "md-security", "md-sim-card",
      "md-smartphone", "md-speaker", "md-tablet", "md-tablet-android", "md-tablet-mac", "md-tv", "md-watch",
      "md-add-to-photos", "md-adjust", "md-assistant-photo", "md-audiotrack", "md-blur-circular", "md-blur-linear",
      "md-blur-off", "md-blur-on", "md-brightness-1", "md-brightness-2", "md-brightness-3", "md-brightness-4",
      "md-brightness-5", "md-brightness-6", "md-brightness-7", "md-brush", "md-camera", "md-camera-alt", "md-camera-front",
      "md-camera-rear", "md-camera-roll", "md-center-focus-strong", "md-center-focus-weak", "md-collections", "md-colorize",
      "md-color-lens", "md-compare", "md-control-point", "md-control-point-duplicate", "md-crop", "md-crop-3-2", "md-crop-5-4",
      "md-crop-7-5", "md-crop-16-9", "md-crop-din", "md-crop-free", "md-crop-landscape", "md-crop-original", "md-crop-portrait",
      "md-crop-square", "md-dehaze", "md-details", "md-edit", "md-exposure", "md-exposure-minus-1", "md-exposure-minus-2",
      "md-exposure-zero", "md-exposure-plus-1", "md-exposure-plus-2", "md-filter", "md-filter-1", "md-filter-2", "md-filter-3",
      "md-filter-4", "md-filter-5", "md-filter-6", "md-filter-7", "md-filter-8", "md-filter-9", "md-filter-9-plus", "md-filter-b-and-w",
      "md-filter-center-focus", "md-filter-drama", "md-filter-frames", "md-filter-hdr", "md-filter-none", "md-filter-tilt-shift",
      "md-filter-vintage", "md-flare", "md-flash-auto", "md-flash-off", "md-flash-on", "md-flip", "md-gradient", "md-grain",
      "md-grid-off", "md-grid-on", "md-hdr-off", "md-hdr-on", "md-hdr-strong", "md-hdr-weak", "md-healing", "md-image",
      "md-image-aspect-ratio", "md-iso", "md-landscape", "md-leak-add", "md-leak-remove", "md-lens", "md-looks", "md-looks-1",
      "md-looks-2", "md-looks-3", "md-looks-4", "md-looks-5", "md-looks-6", "md-loupe", "md-movie-creation", "md-nature",
      "md-nature-people", "md-navigate-before", "md-navigate-next", "md-palette", "md-panorama", "md-panorama-fisheye",
      "md-panorama-horizontal", "md-panorama-vertical", "md-panorama-wide-angle", "md-photo", "md-photo-album", "md-photo-camera",
      "md-photo-library", "md-portrait", "md-remove-red-eye", "md-rotate-left", "md-rotate-right", "md-slideshow", "md-straighten",
      "md-style", "md-switch-camera", "md-switch-video", "md-tag-faces", "md-texture", "md-timelapse", "md-timer", "md-timer-3",
      "md-timer-10", "md-timer-auto", "md-timer-off", "md-tonality", "md-transform", "md-tune", "md-wb-auto", "md-wb-cloudy",
      "md-wb-incandescent", "md-wb-irradescent", "md-wb-sunny", "md-beenhere", "md-directions", "md-directions-bike",
      "md-directions-bus", "md-directions-car", "md-directions-ferry", "md-directions-subway", "md-directions-train",
      "md-directions-transit", "md-directions-walk", "md-flight", "md-hotel", "md-layers", "md-layers-clear", "md-local-airport",
      "md-local-atm", "md-local-attraction", "md-local-bar", "md-local-cafe", "md-local-car-wash", "md-local-convenience-store",
      "md-local-drink", "md-local-florist", "md-local-gas-station", "md-local-grocery-store", "md-local-hospital", "md-local-hotel",
      "md-local-laundry-service", "md-local-library", "md-local-mall", "md-local-movies", "md-local-offer", "md-local-parking",
      "md-local-pharmacy", "md-local-phone", "md-local-pizza", "md-local-play", "md-local-post-office", "md-local-print-shop",
      "md-local-restaurant", "md-local-see", "md-local-shipping", "md-local-taxi", "md-location-history", "md-map",
      "md-my-location", "md-navigation", "md-pin-drop", "md-place", "md-rate-review", "md-restaurant-menu", "md-satellite",
      "md-store-mall-directory", "md-terrain", "md-traffic", "md-apps", "md-cancel", "md-arrow-drop-down-circle",
      "md-arrow-drop-down", "md-arrow-drop-up", "md-arrow-back", "md-arrow-forward", "md-check", "md-close", "md-chevron-left",
      "md-chevron-right", "md-expand-less", "md-expand-more", "md-fullscreen", "md-fullscreen-exit", "md-menu", "md-more-horiz",
      "md-more-vert", "md-refresh", "md-unfold-less", "md-unfold-more", "md-adb", "md-bluetooth-audio", "md-disc-full",
      "md-dnd-forwardslash", "md-do-not-disturb", "md-drive-eta", "md-event-available", "md-event-busy", "md-event-note",
      "md-folder-special", "md-mms", "md-more", "md-network-locked", "md-phone-bluetooth-speaker", "md-phone-forwarded",
      "md-phone-in-talk", "md-phone-locked", "md-phone-missed", "md-phone-paused", "md-play-download", "md-play-install",
      "md-sd-card", "md-sim-card-alert", "md-sms", "md-sms-failed", "md-sync", "md-sync-disabled", "md-sync-problem",
      "md-system-update", "md-tap-and-play", "md-time-to-leave", "md-vibration", "md-voice-chat", "md-vpn-lock", "md-cake",
      "md-domain", "md-location-city", "md-mood", "md-notifications-none", "md-notifications", "md-notifications-off",
      "md-notifications-on", "md-notifications-paused", "md-pages", "md-party-mode", "md-group", "md-group-add", "md-people",
      "md-people-outline", "md-person", "md-person-add", "md-person-outline", "md-plus-one", "md-poll", "md-public", "md-school",
      "md-share", "md-whatshot", "md-check-box", "md-check-box-outline-blank", "md-radio-button-off", "md-radio-button-on",
      "md-star", "md-star-half", "md-star-outline", "md-home", "md-warning", "md-play-circle-fill", "md-forum",
      "md-content-paste", "md-battery-80", "md-format-textdirection-l-to-r", "md-folder-open", "md-desktop-windows",
      "md-collections", "md-directions-bike", "md-apps", "md-phone-in-talk", "md-people", "md-star-half"
    ];


    var img = [
      "ad.svg", "button.svg", "converse.svg", "fire extinguisher.svg", "lamp.svg", "passport.svg", "skate.svg",
      "theatre.svg", "turntable.svg", "wacom.svg", "bill.svg", "buzzer.svg","conveyor.svg", "helmet.svg", "luggage.svg",
      "presentation.svg","smart watch.svg", "tie.svg", "umbrella.svg", "workspace.svg", "bowling.svg", "calculator.svg",
      "demoltion.svg", "icecream.svg", "microscope.svg", "server.svg", "switcher.svg", "tower.svg", "vespa.svg", "wrench.svg"
    ];

    var colors = [
      "pink","red","purple","indigo","blue",
      "light-blue","cyan","teal","green","light-green",
      "lime","yellow","amber","orange","deep-orange"
    ];
    var colorVariation = [
      "lighten-2", "lighten-1",
      //"base",
      "darken-1", "darken-2",
      //"accent-1", "accent-2", "accent-3", "accent-4"
    ];



    function randomInt ( min, max ) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return {

      createFirstname: function(){
        return name.first_name[randomInt(0, name.first_name.length - 1)];
      },

      createLastname: function(){
        return name.last_name[randomInt(0, name.last_name.length - 1)];
      },

      createIcon: function(color){
        color = color || false;

        if(!color){
          return '<i class="md '+icons[randomInt(0, icons.length - 1)]+'"></i>';
        }

        var c = colors[randomInt(0, colors.length-1)];
        var cv = colorVariation[randomInt(0, colorVariation.length-1)];

        return '<i class="md '+icons[randomInt(0, icons.length - 1)]+' '+c+' '+cv+' icon-color"></i>';
      },

      createImg: function(){
        return img[randomInt(0, img.length - 1)];
      },

      createName: function(){
        return this.createFirstname()+' '+this.createLastname();
      },

      createSentence: function ( sentenceLength ) {
        var wordIndex,
          sentence;

        // Determine how long the sentence should be. Do it randomly if one was not
        // provided.
        sentenceLength = sentenceLength || randomInt( 5, 20 );

        // Now we determine were we are going to start in the array randomly. We
        // are just going to take a slice of the array, so we have to ensure
        // whereever we start has enough places left in the array to accommodate
        // the random sentence length from above.
        wordIndex = randomInt(0, words.length - sentenceLength - 1);

        // And pull out the words, join them together, separating words by spaces
        // (duh), and removing any commas that may appear at the end of the
        // sentence. Finally, add a period.
        sentence = words.slice(wordIndex, wordIndex + sentenceLength)
          .join(' ')
          .replace(/\,$/g, '') + '.';

        // Capitalize the first letter - it is a sentence, after all.
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);

        return sentence;
      },
      createSentences: function ( numSentences ) {
        var sentences = [],
          i = 0;

        // Determine how many sentences we should do. Do it randomly if one was not
        // provided.
        numSentences = numSentences || randomInt( 3, 5 );

        // For each paragraph, we should generate between 3 and 5 sentences.
        for ( i = 0; i < numSentences; i++ ) {
          sentences.push( this.createSentence() );
        }

        // And then we just return the array of sentences, concatenated with spaces.
        return sentences.join( ' ' );
      },
      createParagraph: function ( numSentences, html ) {
        var sentences = this.createSentences( numSentences );

        // Make the sentences into a paragraph and return.
        if(html){
          return "<p>" + sentences + "</p>";
        }

        return sentences + "\n";
      },
      createParagraphs: function ( numParagraphs, numSentences, html ) {
        var paragraphs = [],
          i = 0;

        numParagraphs = numParagraphs || randomInt( 3, 7 );

        // Create the number of paragraphs requested.
        for ( i = 0; i < numParagraphs; i++ ) {
          paragraphs.push( this.createParagraph( numSentences, html ) );
        }

        // Return the paragraphs, concatenated with newlines.
        return paragraphs.join( '\n' );
      }
    };
  })

  .directive( 'placeholderText', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {

        numParagraphs = attrs.sentences || 1;
        numSentences = attrs.paragraphs || 6;
        html = attrs.html || true;

        element.html(
          PlaceholderTextService.createParagraphs(numParagraphs, numSentences, true)
        );

      }
    };
  }])

  .directive( 'placeholderTitle', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs) {
        element.html(
          PlaceholderTextService.createSentence(5)
        );
      }
    };
  }])

  .directive( 'placeholderName', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {
        element.html(
          PlaceholderTextService.createName()
        );
      }
    };
  }])

  .directive( 'placeholderP', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {
        element.html(
          PlaceholderTextService.createParagraph(1, 3, false)
        );
      }
    };
  }])

  .directive( 'placeholderImg', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {
        element.attr('src', 'assets/img/icons/ballicons/'+PlaceholderTextService.createImg());
      }
    };
  }])

  .directive( 'placeholderIcon', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ngModel) {
        element.html(
          PlaceholderTextService.createIcon(false)
        );
      }
    };
  }])

  .directive( 'placeholderForm', [ 'PlaceholderTextService', function ( PlaceholderTextService ) {
    return {
      restrict: 'C',
      link: function(scope, element, attrs, ngModel) {

        angular.forEach(element.find('input, textarea'), function(el){
          elem = angular.element(el);

          switch (el.type) {
            case 'textarea':
              el.bla = 'hi';
              elem.val(PlaceholderTextService.createParagraphs(1, 4));
              break;
            case 'text':
              elem.val(PlaceholderTextService.createSentence());
              break;
            case 'password':
              elem.val('nakama?');
              break;
            case 'checkbox':
              elem.attr('checked','checked');
              break;
          }

          if(elem.val()){
            elem.parent().addClass("filled");
          }
        });

      }
    };
  }])


  .directive( 'placeholderImage', function () {
    return {
      restrict: 'A',
      scope: { dimensions: '@placeholderImage' },
      link: function( scope, element, attr ) {

        // A reference to a canvas that we can reuse
        var canvas;
        var config = {
          text_size: 10,
          fill_color: '#EEEEEE',
          text_color: '#AAAAAA'
        };

        /**
         * When the provided dimensions change, re-pull the width and height and
         * then redraw the image.
         */
        scope.$watch('dimensions', function () {
          if( ! angular.isDefined( scope.dimensions ) ) {
            return;
          }
          var matches = scope.dimensions.match( /^(\d+)x(\d+)$/ ),
            dataUrl;

          if(  ! matches ) {
            console.error("Expected '000x000'. Got " + scope.dimensions);
            return;
          }

          // Grab the provided dimensions.
          scope.size = { w: matches[1], h: matches[2] };

          // FIXME: only add these if not already present
          element.prop( "title", scope.dimensions );
          element.prop( "alt", scope.dimensions );

          // And draw the image, getting the returned data URL.
          dataUrl = drawImage();

          // If this is an `img` tag, set the src as the data URL. Else, we set
          // the CSS `background-image` property to same.
          if ( element.prop( "tagName" ) === "IMG" ) {
            element.prop( 'src', dataUrl );
          } else {
            element.css( 'background-image', 'url("' + dataUrl + '")' );
          }
        });

        /**
         * Calculate the maximum height of the text we can draw, based on the
         * requested dimensions of the image.
         */
        function getTextSize() {
          var dimension_arr = [scope.size.h, scope.size.w].sort(),
            maxFactor = Math.round(dimension_arr[1] / 16);

          return Math.max(config.text_size, maxFactor);
        }

        /**
         * Using the HTML5 canvas API, draw a placeholder image of the requested
         * size with text centered vertically and horizontally that specifies its
         * dimensions. Returns the data URL that can be used as an `img`'s `src`
         * attribute.
         */
        function drawImage() {
          // Create a new canvas if we don't already have one. We reuse the canvas
          // when if gets redrawn so as not to be wasteful.
          canvas = canvas || document.createElement( 'canvas' );

          // Obtain a 2d drawing context on which we can add the placeholder
          // image.
          var context = canvas.getContext( '2d' ),
            text_size,
            text;

          // Set the canvas to the appropriate size.
          canvas.width = scope.size.w;
          canvas.height = scope.size.h;

          // Draw the placeholder image square.
          // TODO: support other shapes
          // TODO: support configurable colors
          context.fillStyle = config.fill_color;
          context.fillRect( 0, 0, scope.size.w, scope.size.h );

          // Add the dimension text.
          // TODO: support configurable font
          // FIXME: ensure text will fit and resize if it doesn't
          text_size = getTextSize();
          text = scope.dimensions;
          context.fillStyle = config.text_color;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.font = 'bold '+text_size+'pt sans-serif';

          // If the text is too long to fit, reduce it until it will.
          if (context.measureText( text ).width / scope.size.w > 1) {
            text_size = config.text_size / (context.measureText( text ).width / scope.size.w);
            context.font = 'bold '+text_size+'pt sans-serif';
          }

          // Finally, draw the text in its calculated position.
          context.fillText( scope.dimensions, scope.size.w / 2, scope.size.h / 2 );

          // Get the data URL and return it.
          return canvas.toDataURL("image/png");
        }
      }
    };
  });