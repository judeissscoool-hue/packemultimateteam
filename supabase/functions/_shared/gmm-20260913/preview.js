// Frozen September 13 GMM preview; never delegates to current run rules.

/* v31: Phase 1 merged 2K database + Option B spotlight weighting. */
/* ================= PLAYER DATABASE =================
   [name, position, OVR, team, era]. Top ~60 seeded from
   real all-time 2K-style ratings; rest at plausible OVRs. */
/* GMM_ROSTER_RELEASE 2026-09-13: stable IDs; positions/styles and pool eligibility are explicit. */
const P=[
["Michael Jordan","SG",99,"CHI","90s",["SG","SF"],["Style_FlightClub","Style_Lockdown"],1,true,true],
["LeBron James","SF",99,"CLE","10s",["SF","PF","PG","SG","C"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Kareem Abdul-Jabbar","C",96,"LAL","80s",["C"],["Style_PaintBeast"],1,true,true],
["Kobe Bryant","SG",99,"LAL","00s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Wilt Chamberlain","C",99,"GSW","60s",["C"],["Style_PaintBeast"],1,true,true],
["Hakeem Olajuwon","C",99,"HOU","90s",["C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Larry Bird","SF",99,"BOS","80s",["SF","PF"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Magic Johnson","PG",99,"LAL","80s",["PG","SG","SF","PF","C"],["Style_FloorGeneral"],1,true,true],
["Kevin Garnett","PF",98,"MIN","00s",["PF","C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Tim Duncan","PF",99,"SAS","00s",["PF","C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Shaquille O'Neal","C",99,"LAL","00s",["C"],["Style_PaintBeast"],1,true,true],
["Dirk Nowitzki","PF",98,"DAL","00s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Stephen Curry","PG",98,"GSW","10s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Bill Russell","C",98,"BOS","60s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Giannis Antetokounmpo","PF",97,"MIL","20s",["PF","SF","C"],["Style_PaintBeast","Style_FlightClub"],1,true,true],
["Giannis Antetokounmpo","PF",97,"MIA","20s",["PF","SF","C"],["Style_PaintBeast","Style_FlightClub"],1,true,true],
["Kevin Durant","SF",97,"OKC","10s",["SF","PF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Nikola Jokic","C",98,"DEN","20s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Julius Erving","SF",94,"PHI","70s",["SF","PF"],["Style_FlightClub"],1,true,true],
["Jerry West","PG",97,"LAL","60s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Oscar Robertson","PG",97,"MIL","70s",["PG","SG"],["Style_FloorGeneral"],1,true,true],
["Chris Paul","PG",97,"NOP","00s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Dwyane Wade","SG",97,"MIA","00s",["SG","PG"],["Style_Slasher","Style_Lockdown"],1,true,true],
["Karl Malone","PF",97,"UTA","90s",["PF","C"],["Style_PaintBeast"],1,true,true],
["John Stockton","PG",97,"UTA","90s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Moses Malone","C",97,"HOU","80s",["C"],["Style_PaintBeast"],1,true,true],
["Scottie Pippen","SF",98,"CHI","90s",["SF","PF","SG"],["Style_Lockdown","Style_FlightClub"],1,true,true],
["Vince Carter","SG",97,"TOR","00s",["SG","SF"],["Style_FlightClub"],1,true,true],
["Clyde Drexler","SG",96,"POR","90s",["SG","SF"],["Style_FlightClub"],1,true,true],
["Allen Iverson","SG",96,"PHI","00s",["SG","PG"],["Style_AnkleBreaker","Style_Slasher"],1,true,true],
["Steve Nash","PG",96,"PHX","00s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Kawhi Leonard","SF",96,"SAS","10s",["SF","PF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Shai Gilgeous-Alexander","PG",98,"OKC","20s",["PG","SG"],["Style_Slasher","Style_FloorGeneral"],1,true,true],
["Bob Cousy","PG",96,"BOS","50s",["PG"],["Style_AnkleBreaker","Style_FloorGeneral"],1,true,true],
["Elgin Baylor","SF",96,"LAL","60s",["SF","PF"],["Style_FlightClub"],1,true,true],
["David Robinson","C",96,"SAS","90s",["C","PF"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Charles Barkley","PF",96,"PHX","90s",["PF","SF","C"],["Style_PaintBeast"],1,true,true],
["Joel Embiid","C",96,"PHI","20s",["C","PF"],["Style_PaintBeast"],1,true,true],
["Derrick Rose","PG",95,"CHI","10s",["PG"],["Style_FlightClub","Style_Slasher"],1,true,true],
["Dominique Wilkins","SF",95,"ATL","80s",["SF","PF"],["Style_FlightClub"],1,true,true],
["James Worthy","SF",95,"LAL","80s",["SF","PF"],["Style_FlightClub"],1,true,true],
["Isiah Thomas","PG",95,"DET","80s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Russell Westbrook","PG",95,"OKC","10s",["PG","SG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Patrick Ewing","C",95,"NYK","90s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Tracy McGrady","SG",95,"ORL","00s",["SG","SF","PG"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["James Harden","SG",95,"HOU","10s",["SG","PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Carmelo Anthony","SF",95,"DEN","00s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Gary Payton","PG",95,"OKC","90s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Jason Kidd","PG",95,"BKN","00s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Luka Doncic","PG",97,"DAL","20s",["PG","SG","SF"],["Style_FloorGeneral","Style_Sharpshooter"],1,true,true],
["Luka Doncic","PG",96,"LAL","20s",["PG","SG","SF"],["Style_FloorGeneral","Style_Sharpshooter"],1,true,true],
["Ray Allen","SG",94,"BOS","00s",["SG"],["Style_Sharpshooter"],1,true,true],
["Jayson Tatum","SF",95,"BOS","20s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Pete Maravich","SG",94,"UTA","70s",["SG","PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Damian Lillard","PG",94,"POR","10s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Kyrie Irving","PG",94,"CLE","10s",["PG","SG"],["Style_Slasher","Style_AnkleBreaker"],1,true,true],
["Paul Pierce","SF",94,"BOS","00s",["SF","PF"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["George Gervin","SG",95,"SAS","70s",["SG","SF"],["Style_Slasher"],1,true,true],
["Bob Pettit","PF",95,"ATL","50s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["George Mikan","C",94,"LAL","50s",["C"],["Style_PaintBeast"],1,true,true],
["Dwight Howard","C",93,"ORL","00s",["C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Reggie Miller","SG",93,"IND","90s",["SG"],["Style_Sharpshooter"],1,true,true],
["Walt Frazier","PG",97,"NYK","70s",["PG","SG"],["Style_FloorGeneral","Style_Lockdown"],1,true,true],
["Rick Barry","SF",95,"GSW","70s",["SF","PF"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["John Havlicek","SF",96,"BOS","60s",["SF","SG"],["Style_Lockdown","Style_Slasher"],1,true,false],
["Victor Wembanyama","C",97,"SAS","20s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Kevin McHale","PF",95,"BOS","80s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Elvin Hayes","PF",94,"WAS","70s",["PF","C"],["Style_PaintBeast"],1,true,false],
["Jimmy Butler","SF",95,"MIA","20s",["SF","SG","PF"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Anthony Edwards","SG",96,"MIN","20s",["SG","SF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Yao Ming","C",91,"HOU","00s",["C"],["Style_PaintBeast"],1,true,true],
["Chris Webber","PF",93,"SAC","00s",["PF","C"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Grant Hill","SF",93,"DET","90s",["SF","PF","PG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Penny Hardaway","PG",94,"ORL","90s",["PG","SG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Willis Reed","C",94,"NYK","70s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,false],
["Bill Walton","C",95,"POR","70s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Devin Booker","SG",93,"PHX","20s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Paul George","SF",93,"IND","10s",["SF","SG","PF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Dolph Schayes","PF",94,"PHI","50s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["Pau Gasol","PF",91,"LAL","00s",["PF","C"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Dikembe Mutombo","C",90,"DEN","90s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Alonzo Mourning","C",94,"MIA","90s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Chris Bosh","PF",90,"MIA","10s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Bernard King","SF",89,"NYK","80s",["SF","PF"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Dave Cowens","C",95,"BOS","70s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,false],
["Nate Thurmond","C",92,"GSW","60s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,false],
["Dennis Rodman","PF",90,"DET","90s",["PF","C","SF"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Ja Morant","PG",91,"MEM","20s",["PG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Ja Morant","PG",87,"POR","20s",["PG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Donovan Mitchell","SG",93,"CLE","20s",["SG","PG"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Karl-Anthony Towns","C",92,"MIN","20s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Karl-Anthony Towns","C",90,"NYK","20s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Jalen Brunson","PG",96,"NYK","20s",["PG"],["Style_Slasher","Style_FloorGeneral"],1,true,true],
["Tony Parker","PG",95,"SAS","00s",["PG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Manu Ginobili","SG",90,"SAS","00s",["SG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Klay Thompson","SG",91,"GSW","10s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Shawn Kemp","PF",90,"OKC","90s",["PF","C"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Alex English","SF",93,"DEN","80s",["SF"],["Style_Sharpshooter"],1,true,true],
["Adrian Dantley","SF",91,"UTA","80s",["SF","SG"],["Style_PaintBeast","Style_Slasher"],1,true,true],
["Wes Unseld","C",94,"WAS","70s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,false],
["Earl Monroe","SG",88,"NYK","70s",["SG","PG"],["Style_AnkleBreaker"],1,true,false],
["Bam Adebayo","C",89,"MIA","20s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Jaylen Brown","SG",95,"BOS","20s",["SG","SF"],["Style_Slasher"],1,true,true],
["Tyrese Haliburton","PG",93,"IND","20s",["PG","SG"],["Style_FloorGeneral","Style_Sharpshooter"],1,true,true],
["Cade Cunningham","PG",92,"DET","20s",["PG","SG"],["Style_FloorGeneral"],1,true,true],
["Draymond Green","PF",89,"GSW","10s",["PF","C","SF"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Tim Hardaway","PG",90,"GSW","90s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Chris Mullin","SF",94,"GSW","90s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Kevin Johnson","PG",89,"PHX","90s",["PG"],["Style_Slasher","Style_FloorGeneral"],1,true,true],
["Amar'e Stoudemire","PF",92,"PHX","00s",["PF","C"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Trae Young","PG",89,"WAS","20s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Zion Williamson","PF",88,"NOP","20s",["PF","C"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Rudy Gobert","C",88,"UTA","10s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["De'Aaron Fox","PG",86,"SAC","20s",["PG","SG"],["Style_Slasher"],1,true,true],
["Jalen Williams","SF",89,"OKC","20s",["SF","SG","PF"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Robert Parish","C",93,"BOS","80s",["C"],["Style_PaintBeast"],1,true,true],
["Chauncey Billups","PG",87,"DET","00s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Mitch Richmond","SG",94,"SAC","90s",["SG"],["Style_Sharpshooter"],1,true,true],
["LaMarcus Aldridge","PF",89,"POR","10s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Gilbert Arenas","PG",93,"WAS","00s",["PG","SG"],["Style_Sharpshooter","Style_AnkleBreaker"],1,true,true],
["DeMar DeRozan","SG",89,"TOR","10s",["SG","SF"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Domantas Sabonis","C",88,"SAC","20s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Alperen Sengun","C",88,"HOU","20s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Tyrese Maxey","PG",93,"PHI","20s",["PG","SG"],["Style_Slasher","Style_Sharpshooter"],1,true,true],
["Evan Mobley","PF",89,"CLE","20s",["PF","C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Paolo Banchero","PF",88,"ORL","20s",["PF","C","SF"],["Style_PaintBeast"],1,true,true],
["Joe Dumars","SG",93,"DET","80s",["SG","PG"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Marc Gasol","C",93,"MEM","10s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Shawn Marion","SF",91,"PHX","00s",["SF","PF"],["Style_FlightClub","Style_Lockdown"],1,true,true],
["Mark Price","PG",93,"CLE","90s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["John Wall","PG",89,"WAS","10s",["PG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Jamal Murray","PG",89,"DEN","20s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Chet Holmgren","C",87,"OKC","20s",["C","PF"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Dennis Johnson","PG",85,"BOS","80s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Ben Wallace","C",89,"DET","00s",["C","PF"],["Style_Lockdown"],1,true,true],
["Rasheed Wallace","PF",85,"DET","00s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Deron Williams","PG",87,"UTA","00s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Rajon Rondo","PG",90,"BOS","10s",["PG"],["Style_FloorGeneral","Style_Lockdown"],1,true,true],
["Jrue Holiday","PG",87,"MIL","20s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Glen Rice","SF",90,"CHA","90s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Kyle Lowry","PG",89,"TOR","10s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Blake Griffin","PF",88,"LAC","10s",["PF"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Sam Jones","SG",90,"BOS","60s",["SG"],["Style_Sharpshooter"],1,true,false],
["Kevin Love","PF",87,"CLE","10s",["PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Mike Conley","PG",88,"MEM","10s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Baron Davis","PG",91,"GSW","00s",["PG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Tommy Heinsohn","PF",89,"BOS","60s",["PF"],["Style_PaintBeast"],1,true,false],
["Richard Hamilton","SG",89,"DET","00s",["SG"],["Style_Sharpshooter"],1,true,true],
["Glenn Robinson","SF",87,"MIL","90s",["SF"],["Style_Sharpshooter"],1,true,true],
["Maurice Cheeks","PG",86,"PHI","80s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["David West","PF",80,"IND","10s",["PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Mike Bibby","PG",88,"SAC","00s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Jason Richardson","SG",87,"GSW","00s",["SG"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Jamaal Wilkes","SF",87,"LAL","80s",["SF"],["Style_Sharpshooter"],1,true,true],
["Jason Terry","SG",86,"DAL","00s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Roy Hibbert","C",86,"IND","10s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Kenyon Martin","PF",87,"BKN","00s",["PF"],["Style_FlightClub","Style_Lockdown"],1,true,true],
["Richard Jefferson","SF",87,"BKN","00s",["SF"],["Style_FlightClub"],1,true,true],
["Josh Howard","SF",84,"DAL","00s",["SF"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Larry Johnson","PF",88,"CHA","90s",["PF","SF"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Bradley Beal","SG",89,"WAS","20s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["LaMelo Ball","PG",88,"MIN","20s",["PG","SG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Scottie Barnes","SF",89,"TOR","20s",["SF","PF","PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Franz Wagner","SF",87,"ORL","20s",["SF","PF"],["Style_Slasher"],1,true,true],
["Arvydas Sabonis","C",88,"POR","90s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Peja Stojakovic","SF",88,"SAC","00s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Zach Randolph","PF",89,"MEM","10s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Zach LaVine","SG",86,"CHI","20s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Khris Middleton","SF",88,"MIL","20s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Brook Lopez","C",84,"MIL","20s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["CJ McCollum","SG",83,"ATL","10s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Sam Cassell","PG",82,"HOU","90s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Bill Laimbeer","C",87,"DET","80s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Richard Hamilton","SG",89,"DET","00s",["SG"],["Style_Sharpshooter"],0,false,false],
["Vlade Divac","C",88,"SAC","00s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Tyler Herro","SG",87,"MIL","20s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Aaron Gordon","PF",83,"DEN","20s",["PF","SF","C"],["Style_FlightClub"],1,true,true],
["Latrell Sprewell","SG",81,"NYK","90s",["SG","SF"],["Style_Slasher"],1,true,true],
["Horace Grant","PF",85,"CHI","90s",["PF","C"],["Style_Lockdown"],1,true,true],
["Toni Kukoc","SF",85,"CHI","90s",["SF","PF"],["Style_FloorGeneral","Style_Sharpshooter"],1,true,true],
["Jeff Hornacek","SG",80,"UTA","90s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Andrei Kirilenko","SF",89,"UTA","00s",["SF","PF"],["Style_Lockdown"],1,true,true],
["Lamar Odom","PF",80,"LAL","00s",["PF","SF","C"],["Style_FloorGeneral"],1,true,true],
["Metta World Peace","SF",88,"IND","00s",["SF","SG"],["Style_Lockdown"],1,true,true],
["Andre Iguodala","SF",80,"GSW","10s",["SF","SG"],["Style_Lockdown"],1,true,true],
["Michael Porter Jr.","SF",86,"DEN","20s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Austin Reaves","SG",87,"LAL","20s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Byron Scott","SG",79,"LAL","80s",["SG"],["Style_Sharpshooter"],1,true,true],
["Charles Oakley","PF",86,"NYK","90s",["PF"],["Style_Lockdown"],1,true,true],
["Lou Williams","SG",78,"LAC","10s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["DeAndre Jordan","C",87,"LAC","10s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Andrew Wiggins","SF",82,"GSW","20s",["SF","SG"],["Style_FlightClub"],1,true,true],
["John Starks","SG",88,"NYK","90s",["SG"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Jason Williams","PG",76,"SAC","00s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Robert Horry","PF",74,"LAL","00s",["PF","C","SF"],["Style_Sharpshooter"],1,true,true],
["Michael Cooper","SG",86,"LAL","80s",["SG","SF","PG"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Shane Battier","SF",72,"MIA","10s",["SF","PF","SG"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Steve Kerr","PG",72,"CHI","90s",["PG","SG"],["Style_Sharpshooter"],1,true,true],
["Muggsy Bogues","PG",85,"CHA","90s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["JR Smith","SG",72,"CLE","10s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Boris Diaw","PF",72,"SAS","10s",["PF","C","SF"],["Style_PaintBeast"],1,true,true],
["Tony Allen","SG",85,"MEM","10s",["SG","SF"],["Style_Lockdown"],1,true,true],
["Derek Fisher","PG",70,"LAL","00s",["PG"],["Style_FloorGeneral"],1,true,true],
["Danny Green","SG",70,"SAS","10s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Nate Robinson","PG",70,"NYK","00s",["PG","SG"],["Style_FlightClub"],1,true,true],
["Jeremy Lin","PG",70,"NYK","10s",["PG","SG"],["Style_FloorGeneral"],1,true,true],
["Bruce Bowen","SF",86,"SAS","00s",["SF","SG"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["John Paxson","PG",68,"CHI","90s",["PG","SG"],["Style_Sharpshooter"],1,true,true],
["Spud Webb","PG",68,"ATL","80s",["PG"],["Style_FlightClub"],1,true,true],
["Patty Mills","PG",68,"SAS","10s",["PG","SG"],["Style_FloorGeneral"],1,true,true],
["Udonis Haslem","PF",84,"MIA","00s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Shaun Livingston","PG",66,"GSW","10s",["PG","SG"],["Style_FloorGeneral"],1,true,true],
["Kevon Looney","C",79,"GSW","20s",["C","PF"],["Style_PaintBeast"],1,true,true],
["Gary Payton II","SG",77,"GSW","20s",["SG","PG"],["Style_Lockdown"],1,true,true],
["Kendrick Perkins","C",62,"BOS","00s",["C"],["Style_PaintBeast"],1,true,true],
["Kurt Rambis","PF",60,"LAL","80s",["PF","C"],["Style_Lockdown"],1,true,true],
["Shawn Bradley","C",60,"DAL","90s",["C"],["Style_Lockdown"],1,true,true],
["Manute Bol","C",58,"WAS","80s",["C"],["Style_Lockdown"],1,true,true],
["Matt Bonner","PF",55,"SAS","10s",["PF","C"],["Style_Sharpshooter"],1,true,true],
["Brian Scalabrine","PF",45,"BOS","00s",["PF","SF","C"],["Style_PaintBeast"],1,true,true],
["Mark Madsen","PF",44,"LAL","00s",["PF"],["Style_PaintBeast"],1,true,true],
["LeBron James","SF",99,"MIA","10s",["SF","PF","PG","SG","C"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["LeBron James","SF",97,"LAL","20s",["SF","PF","PG","SG","C"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Kareem Abdul-Jabbar","C",98,"MIL","70s",["C"],["Style_PaintBeast"],1,true,true],
["Wilt Chamberlain","C",93,"PHI","60s",["C"],["Style_PaintBeast"],1,true,true],
["Wilt Chamberlain","C",91,"LAL","70s",["C"],["Style_PaintBeast"],1,true,true],
["Shaquille O'Neal","C",95,"ORL","90s",["C"],["Style_PaintBeast"],1,true,true],
["Shaquille O'Neal","C",91,"MIA","00s",["C"],["Style_PaintBeast"],1,true,true],
["Kevin Durant","SF",97,"GSW","10s",["SF","PF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Kevin Durant","SF",94,"HOU","20s",["SF","PF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Kawhi Leonard","SF",96,"TOR","10s",["SF","PF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Kawhi Leonard","SF",95,"LAC","20s",["SF","PF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Chris Paul","PG",95,"LAC","10s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Moses Malone","C",97,"PHI","80s",["C"],["Style_PaintBeast"],1,true,true],
["Charles Barkley","PF",94,"PHI","80s",["PF","SF","C"],["Style_PaintBeast"],1,true,true],
["Jason Kidd","PG",93,"PHX","90s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Ray Allen","SG",94,"OKC","00s",["SG"],["Style_Sharpshooter"],1,true,true],
["Ray Allen","SG",90,"MIA","10s",["SG"],["Style_Sharpshooter"],1,true,true],
["Kyrie Irving","PG",92,"DAL","20s",["PG","SG"],["Style_Slasher","Style_AnkleBreaker"],1,true,true],
["Anthony Davis","PF",94,"LAL","20s",["PF","C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Anthony Davis","PF",94,"NOP","10s",["PF","C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Dwight Howard","C",89,"LAL","10s",["C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["James Harden","SG",89,"CLE","20s",["SG","PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Carmelo Anthony","SF",92,"NYK","10s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Tracy McGrady","SG",94,"HOU","00s",["SG","SF","PG"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Allen Iverson","SG",92,"DEN","00s",["SG","PG"],["Style_AnkleBreaker","Style_Slasher"],1,true,true],
["Kevin Garnett","PF",96,"BOS","00s",["PF","C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Pau Gasol","PF",92,"MEM","00s",["PF","C"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Chris Bosh","PF",90,"TOR","00s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Dennis Rodman","PF",93,"CHI","90s",["PF","C","SF"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Jimmy Butler","SF",91,"CHI","10s",["SF","SG","PF"],["Style_Lockdown","Style_Slasher"],1,true,true],
,
["DeMarcus Cousins","C",92,"SAC","10s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Jermaine O'Neal","C",91,"IND","00s",["C","PF"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Elton Brand","PF",90,"LAC","00s",["PF","C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Isaiah Thomas","PG",89,"BOS","10s",["PG"],["Style_Sharpshooter","Style_AnkleBreaker"],1,true,true],
["Brandon Roy","SG",91,"POR","00s",["SG"],["Style_Slasher","Style_Sharpshooter"],1,true,true],
["Gordon Hayward","SF",88,"UTA","10s",["SF","SG"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Joe Johnson","SG",89,"ATL","00s",["SG","SF"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Kemba Walker","PG",89,"CHA","10s",["PG"],["Style_AnkleBreaker","Style_Sharpshooter"],1,true,true],
["Michael Finley","SG",88,"DAL","00s",["SG","SF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Pascal Siakam","PF",87,"IND","20s",["PF","SF"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Victor Oladipo","SG",88,"IND","10s",["SG","PG"],["Style_Slasher","Style_Lockdown"],1,true,true],
["Antawn Jamison","PF",87,"WAS","00s",["PF","SF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Antonio McDyess","PF",88,"DEN","00s",["PF","C"],["Style_PaintBeast","Style_FlightClub"],1,true,true],
["Joakim Noah","C",87,"CHI","10s",["C"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Paul Millsap","PF",88,"ATL","10s",["PF"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Stephon Marbury","PG",87,"NYK","00s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Al Horford","C",86,"ATL","10s",["C","PF"],["Style_Lockdown","Style_Sharpshooter"],1,true,true],
["Andrew Bynum","C",86,"LAL","10s",["C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Brandon Ingram","SF",86,"NOP","20s",["SF","SG"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Carlos Boozer","PF",88,"UTA","00s",["PF"],["Style_PaintBeast"],1,true,true],
["Clint Capela","C",86,"HOU","10s",["C"],["Style_PaintBeast","Style_Lockdown"],1,true,true],
["Julius Randle","PF",86,"MIN","20s",["PF"],["Style_PaintBeast","Style_Slasher"],1,true,true],
["Kristaps Porzingis","PF",87,"NYK","20s",["PF","C"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Rashard Lewis","SF",86,"ORL","00s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Rudy Gay","SF",86,"MEM","10s",["SF"],["Style_Slasher","Style_Sharpshooter"],1,true,true],
["Al Jefferson","C",87,"CHA","10s",["C","PF"],["Style_PaintBeast"],0.95,true,true],
["Andre Drummond","C",86,"DET","10s",["C"],["Style_PaintBeast"],1,true,true],
["Darius Garland","PG",87,"CLE","20s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Dejounte Murray","PG",86,"SAS","20s",["PG","SG"],["Style_Lockdown"],1,true,true],
["Fred VanVleet","PG",85,"TOR","20s",["PG"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Goran Dragic","PG",85,"PHX","10s",["PG"],["Style_Slasher"],1,true,true],
["Hassan Whiteside","C",85,"MIA","10s",["C"],["Style_Lockdown"],1,true,true],
["Jerry Stackhouse","SG",89,"DET","00s",["SG","SF"],["Style_Slasher"],0.95,true,true],
["Marcus Camby","C",85,"DEN","00s",["C"],["Style_Lockdown"],0.95,true,true],
["Michael Redd","SG",88,"MIL","00s",["SG"],["Style_Sharpshooter"],0.95,true,true],
["Nikola Vucevic","C",86,"ORL","20s",["C"],["Style_PaintBeast","Style_Sharpshooter"],1,true,true],
["Robert Williams","C",85,"BOS","20s",["C"],["Style_Lockdown"],1,true,true],
["Serge Ibaka","PF",85,"OKC","10s",["PF","C"],["Style_Lockdown"],1,true,true],
["Andres Nocioni","PF",84,"CHI","00s",["PF"],["Style_Lockdown"],0.7,true,true],
["Caron Butler","SF",88,"WAS","00s",["SF"],["Style_Slasher"],0.9,true,true],
["Chris Kaman","C",87,"LAC","00s",["C"],["Style_PaintBeast"],0.7,true,true],
["D'Angelo Russell","PG",84,"MIN","20s",["PG","SG"],["Style_Sharpshooter"],1,true,true],
["Danny Granger","SF",88,"IND","00s",["SF"],["Style_Sharpshooter"],0.85,true,true],
["David Lee","PF",84,"GSW","10s",["PF"],["Style_PaintBeast"],0.85,true,true],
["Deandre Ayton","C",84,"PHX","20s",["C"],["Style_PaintBeast"],1,true,true],
["Emeka Okafor","PF",84,"CHA","00s",["PF"],["Style_Lockdown"],0.7,true,true],
["Gerald Wallace","SF",84,"POR","10s",["SF"],["Style_Lockdown"],0.85,true,true],
["Jamaal Magloire","C",84,"MIL","00s",["C"],["Style_PaintBeast"],0.7,true,true],
["Jarrett Allen","C",86,"CLE","20s",["C"],["Style_Lockdown"],1,true,true],
["Josh Smith","PF",86,"ATL","10s",["PF","SF"],["Style_FlightClub","Style_Lockdown"],1,true,true],
["Jusuf Nurkic","C",84,"POR","20s",["C"],["Style_PaintBeast"],1,true,true],
["Kevin Martin","SG",86,"SAC","00s",["SG"],["Style_Sharpshooter"],0.9,true,true],
["Kirk Hinrich","PG",84,"CHI","00s",["PG"],["Style_FloorGeneral"],0.7,true,true],
["Luol Deng","SF",84,"CHI","00s",["SF"],["Style_Lockdown"],0.9,true,true],
["Mike James","PG",84,"MIN","00s",["PG"],["Style_Sharpshooter"],0.7,true,true],
["Monta Ellis","SG",84,"GSW","10s",["SG","PG"],["Style_Slasher"],1,true,true],
["Myles Turner","C",84,"IND","10s",["C"],["Style_PaintBeast"],0.85,true,true],
["Ricky Davis","SG",84,"MIN","00s",["SG"],["Style_FlightClub"],0.7,true,true],
["Stephen Jackson","SG",84,"CHA","10s",["SG"],["Style_Lockdown"],0.85,true,true],
["Theo Ratliff","C",84,"PHI","00s",["C"],["Style_Lockdown"],0.7,true,true],
["Zydrunas Ilgauskas","C",88,"CLE","00s",["C"],["Style_PaintBeast"],0.7,true,true],
["Andre Miller","PG",83,"DEN","00s",["PG"],["Style_FloorGeneral"],0.85,true,true],
["Avery Bradley","SG",83,"LAC","10s",["SG"],["Style_Sharpshooter"],0.8,true,true],
["Ben Gordon","SG",83,"CHI","00s",["SG"],["Style_Sharpshooter"],0.65,true,true],
["Brandon Jennings","PG",83,"DET","10s",["PG"],["Style_FlightClub"],0.8,true,true],
["Caris LeVert","SF",83,"IND","20s",["SF"],["Style_FlightClub"],0.95,true,true],
["Christian Wood","PF",83,"HOU","20s",["PF"],["Style_PaintBeast"],0.95,true,true],
["Corey Maggette","SF",86,"LAC","00s",["SF","SG"],["Style_Slasher"],0.85,true,true],
["Danilo Gallinari","SF",83,"ATL","20s",["SF"],["Style_FlightClub"],0.95,true,true],
["Devin Harris","PG",83,"BKN","10s",["PG"],["Style_Slasher"],1,true,true],
["Eric Bledsoe","PG",83,"PHX","10s",["PG","SG"],["Style_Lockdown"],1,true,true],
["Erick Dampier","C",83,"GSW","00s",["C"],["Style_PaintBeast"],0.65,true,true],
["Jamal Crawford","SG",83,"NYK","00s",["SG"],["Style_Sharpshooter"],0.65,true,true],
["Jaren Jackson Jr.","PF",89,"UTA","20s",["PF","C"],["Style_Sharpshooter","Style_Lockdown"],0.95,true,true],
["Joe Smith","C",83,"MIN","00s",["C"],["Style_PaintBeast"],0.65,true,true],
["Jonas Valanciunas","C",83,"NOP","20s",["C"],["Style_PaintBeast"],0.95,true,true],
["Malcolm Brogdon","SG",83,"IND","20s",["SG"],["Style_Sharpshooter"],0.95,true,true],
["Mehmet Okur","C",83,"UTA","00s",["C"],["Style_Sharpshooter"],0.65,true,true],
["Mike Dunleavy Jr.","SF",83,"GSW","00s",["SF"],["Style_Sharpshooter"],0.65,true,true],
["RJ Barrett","SF",83,"NYK","20s",["SF","SG"],["Style_FlightClub"],0.95,true,true],
["Spencer Dinwiddie","PG",83,"BKN","20s",["PG"],["Style_FloorGeneral"],0.95,true,true],
["Tayshaun Prince","SF",83,"DET","00s",["SF"],["Style_Lockdown"],0.65,true,true],
["Tobias Harris","PF",83,"PHI","20s",["PF","SF"],["Style_Sharpshooter"],1,true,true],
["Troy Murphy","PF",83,"GSW","00s",["PF"],["Style_Sharpshooter"],0.65,true,true],
["Al Harrington","C",82,"GSW","00s",["C"],["Style_Sharpshooter"],0.6,true,true],
["Andrew Bogut","C",82,"MIL","10s",["C"],["Style_PaintBeast"],0.75,true,true],
["Brad Miller","C",82,"SAC","00s",["C"],["Style_FloorGeneral"],0.8,true,true],
["Collin Sexton","PG",82,"CLE","20s",["PG","SG"],["Style_FloorGeneral"],0.9,true,true],
["Eric Gordon","SG",82,"HOU","10s",["SG"],["Style_Sharpshooter"],0.95,true,true],
["Evan Turner","SF",82,"IND","10s",["SF"],["Style_FloorGeneral"],0.75,true,true],
["George Hill","PG",82,"CLE","10s",["PG"],["Style_FloorGeneral"],0.75,true,true],
["Iman Shumpert","SG",82,"NYK","10s",["SG"],["Style_Lockdown"],0.75,true,true],
["Jerami Grant","SF",82,"DET","20s",["SF"],["Style_FlightClub"],0.9,true,true],
["Jim Jackson","SF",82,"ATL","00s",["SF","SG"],["Style_Sharpshooter"],0.6,true,true],
["John Collins","PF",82,"ATL","20s",["PF"],["Style_FlightClub"],1,true,true],
["Jonathan Isaac","PF",82,"ORL","20s",["PF","SF"],["Style_PaintBeast"],0.9,true,true],
["Jose Calderon","PG",82,"TOR","00s",["PG"],["Style_FloorGeneral"],0.8,true,true],
["Juwan Howard","PF",82,"WAS","00s",["PF"],["Style_PaintBeast"],0.8,true,true],
["Larry Hughes","SG",82,"CLE","00s",["SG","PG"],["Style_Lockdown"],0.8,true,true],
["Lonzo Ball","PG",82,"CHI","20s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],0.9,true,true],
["Matt Harpring","SF",82,"UTA","00s",["SF"],["Style_Lockdown"],0.6,true,true],
["Michael Beasley","PF",82,"MIA","00s",["PF"],["Style_Sharpshooter"],0.6,true,true],
["Mikal Bridges","SF",84,"NYK","20s",["SF","SG"],["Style_FlightClub"],0.9,true,true],
["Mike Miller","SF",82,"MIN","00s",["SF","SG"],["Style_Sharpshooter"],0.6,true,true],
["Montrezl Harrell","C",82,"LAL","20s",["C"],["Style_PaintBeast"],0.9,true,true],
["Steven Adams","C",82,"NOP","20s",["C"],["Style_PaintBeast"],0.9,true,true],
["Terry Rozier","PG",82,"CHA","20s",["PG"],["Style_FloorGeneral"],0.9,true,true],
["Ty Lawson","PG",82,"DEN","10s",["PG"],["Style_FloorGeneral"],0.95,true,true],
["Tyreke Evans","SG",82,"SAC","10s",["SG"],["Style_FlightClub"],0.75,true,true],
["Andris Biedrins","C",81,"GSW","00s",["C"],["Style_PaintBeast"],0.55,true,true],
["Bojan Bogdanovic","SF",82,"UTA","20s",["SF"],["Style_FlightClub"],0.85,true,true],
["Buddy Hield","SG",81,"SAC","20s",["SG"],["Style_Sharpshooter"],0.85,true,true],
["Gary Harris","SG",81,"DEN","10s",["SG"],["Style_Sharpshooter"],0.7,true,true],
["Greg Monroe","PF",81,"DET","10s",["PF"],["Style_PaintBeast"],0.7,true,true],
["Harrison Barnes","PF",81,"DAL","10s",["PF"],["Style_PaintBeast"],0.7,true,true],
["Jabari Parker","PF",81,"MIL","10s",["PF"],["Style_PaintBeast"],0.7,true,true],
["James Posey","SF",81,"DEN","00s",["SF"],["Style_Lockdown"],0.55,true,true],
["Kelly Oubre Jr.","SF",81,"GSW","20s",["SF","SG"],["Style_FlightClub"],0.85,true,true],
["Kenneth Faried","PF",81,"DEN","10s",["PF"],["Style_PaintBeast"],0.7,true,true],
["Kyle Korver","SF",81,"PHI","00s",["SF"],["Style_Sharpshooter"],0.55,true,true],
["Lance Stephenson","SG",81,"IND","10s",["SG","SF"],["Style_Slasher"],0.9,true,true],
["Leandro Barbosa","SG",81,"PHX","00s",["SG","PG"],["Style_Slasher"],0.75,true,true],
["Marcin Gortat","C",81,"WAS","10s",["C"],["Style_PaintBeast"],0.7,true,true],
["Marvin Bagley III","PF",81,"SAC","20s",["PF","C"],["Style_PaintBeast"],0.85,true,true],
["Mitchell Robinson","C",82,"NYK","20s",["C","PF"],["Style_PaintBeast"],0.85,true,true],
["Nikola Pekovic","C",81,"MIN","10s",["C"],["Style_PaintBeast"],0.7,true,true],
["Primoz Brezec","C",81,"CHA","00s",["C"],["Style_PaintBeast"],0.55,true,true],
["Quentin Richardson","SF",81,"NYK","00s",["SF"],["Style_Sharpshooter"],0.55,true,true],
["Samuel Dalembert","C",81,"PHI","00s",["C"],["Style_Lockdown"],0.55,true,true],
["Tyson Chandler","C",83,"NOP","00s",["C"],["Style_Lockdown"],0.55,true,true],
["Aaron Brooks","PG",80,"PHX","10s",["PG"],["Style_FlightClub"],0.65,true,true],
["Anthony Parker","SG",80,"TOR","00s",["SG"],["Style_Lockdown"],0.5,true,true],
["Antonio Daniels","SG",80,"SAS","00s",["SG"],["Style_FloorGeneral"],0.5,true,true],
["Austin Rivers","SG",80,"LAC","10s",["SG"],["Style_Sharpshooter"],0.65,true,true],
["Bogdan Bogdanovic","SG",80,"ATL","20s",["SG","SF"],["Style_Sharpshooter"],0.8,true,true],
["Brandon Clarke","PF",80,"MEM","20s",["PF","SF"],["Style_PaintBeast"],0.8,true,true],
["Brendan Haywood","C",80,"WAS","00s",["C"],["Style_Lockdown"],0.5,true,true],
["Darren Collison","PG",80,"IND","10s",["PG"],["Style_FloorGeneral"],0.65,true,true],
["De'Andre Hunter","SF",80,"ATL","20s",["SF","PF"],["Style_FlightClub"],0.8,true,true],
["Delonte West","SG",80,"BOS","00s",["SG"],["Style_FloorGeneral"],0.5,true,true],
["Dennis Schroder","PG",80,"HOU","20s",["PG"],["Style_FloorGeneral"],0.8,true,true],
["Derrick Favors","PF",80,"UTA","10s",["PF","C"],["Style_PaintBeast"],0.85,true,true],
["Dion Waiters","SG",80,"MIA","10s",["SG"],["Style_Sharpshooter"],0.65,true,true],
["Evan Fournier","SG",80,"BOS","20s",["SG"],["Style_Sharpshooter"],0.8,true,true],
["Grayson Allen","SG",80,"UTA","10s",["SG","PG"],["Style_Sharpshooter"],0.65,true,true],
["Greg Oden","C",80,"POR","00s",["C"],["Style_PaintBeast"],0.5,true,true],
["Jae Crowder","SF",80,"UTA","10s",["SF"],["Style_FlightClub"],0.65,true,true],
["Jamaal Tinsley","PG",80,"IND","00s",["PG"],["Style_FloorGeneral"],0.5,true,true],
["Joe Ingles","SF",80,"POR","20s",["SF"],["Style_FlightClub"],0.8,true,true],
["Josh Childress","SF",80,"ATL","00s",["SF"],["Style_Lockdown"],0.5,true,true],
["Josh Richardson","SG",80,"DAL","20s",["SG"],["Style_Sharpshooter"],0.8,true,true],
["Keldon Johnson","SF",81,"SAS","20s",["SF","SG"],["Style_FlightClub"],0.8,true,true],
["Lauri Markkanen","PF",87,"UTA","20s",["PF","C"],["Style_Sharpshooter"],0.8,true,true],
["Malik Beasley","SG",80,"MIN","20s",["SG"],["Style_Sharpshooter"],0.8,true,true],
["Marcus Smart","SG",82,"BOS","20s",["SG"],["Style_Sharpshooter"],0.8,true,true],
["Markelle Fultz","PG",80,"PHI","10s",["PG","SG"],["Style_FloorGeneral"],0.65,true,true],
["Michael Carter-Williams","PG",80,"MIL","10s",["PG"],["Style_FloorGeneral"],0.65,true,true],
["Morris Peterson","SF",85,"TOR","00s",["SF"],["Style_Sharpshooter","Style_Lockdown"],0.5,true,true],
["Norman Powell","SG",84,"LAC","20s",["SG"],["Style_Sharpshooter"],0.8,true,true],
["Otto Porter Jr.","PF",80,"WAS","10s",["PF","SF"],["Style_PaintBeast"],0.65,true,true],
["Raja Bell","SG",80,"PHX","00s",["SG"],["Style_Lockdown"],0.5,true,true],
["Randy Foye","PG",80,"MIN","00s",["PG"],["Style_Sharpshooter"],0.5,true,true],
["Raymond Felton","PG",80,"CHA","00s",["PG"],["Style_FloorGeneral"],0.5,true,true],
["Reggie Jackson","PG",80,"LAC","20s",["PG"],["Style_FloorGeneral"],0.8,true,true],
["Rodney Stuckey","SG",80,"DET","10s",["SG"],["Style_FlightClub"],0.65,true,true],
["Taj Gibson","PF",80,"CHI","10s",["PF"],["Style_Lockdown"],0.65,true,true],
["Tim Hardaway Jr.","SG",80,"NYK","10s",["SG","SF"],["Style_Sharpshooter"],0.65,true,true],
["Tim Thomas","SF",80,"MIL","00s",["SF"],["Style_Sharpshooter"],0.5,true,true],
["Wendell Carter Jr.","C",81,"ORL","20s",["C","PF"],["Style_PaintBeast"],0.8,true,true],
["Wilson Chandler","SF",80,"DEN","10s",["SF"],["Style_FlightClub"],0.65,true,true],
["Andrea Bargnani","PF",84,"TOR","10s",["PF"],["Style_Sharpshooter"],0.45,true,true],
["Arron Afflalo","SF",79,"ORL","10s",["SF"],["Style_Lockdown"],0.6,true,true],
["Bobby Portis","PF",82,"MIL","20s",["PF"],["Style_PaintBeast"],0.75,true,true],
["Brandon Knight","PG",79,"PHX","10s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Chandler Parsons","SF",79,"DAL","10s",["SF"],["Style_Sharpshooter"],0.6,true,true],
["Channing Frye","PF",79,"NYK","00s",["PF"],["Style_Sharpshooter"],0.45,true,true],
["Charlie Villanueva","PF",79,"MIL","00s",["PF"],["Style_Sharpshooter"],0.45,true,true],
["Chris Boucher","PF",79,"TOR","20s",["PF","C"],["Style_PaintBeast"],0.75,true,true],
["Daniel Theis","C",79,"CHI","20s",["C","PF"],["Style_PaintBeast"],0.75,true,true],
["Davis Bertans","PF",79,"WAS","20s",["PF"],["Style_PaintBeast"],0.75,true,true],
["Derrick White","PG",87,"BOS","20s",["PG","SG"],["Style_FloorGeneral"],0.75,true,true],
["Devonte' Graham","PG",79,"CHA","20s",["PG","SG"],["Style_FloorGeneral"],0.75,true,true],
["Donte DiVincenzo","SG",80,"SAC","20s",["SG","PG"],["Style_Sharpshooter"],0.75,true,true],
["Drew Gooden","PF",79,"CLE","00s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Earl Watson","PG",79,"OKC","00s",["PG"],["Style_FloorGeneral"],0.45,true,true],
["Eddy Curry","C",79,"NYK","00s",["C"],["Style_PaintBeast"],0.45,true,true],
["Eric Paschall","PF",79,"GSW","20s",["PF","SF"],["Style_PaintBeast"],0.75,true,true],
["Jalen Green","PG",84,"HOU","20s",["PG","SG"],["Style_FloorGeneral"],0.75,true,true],
["Jameer Nelson","PG",83,"ORL","00s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],0.6,true,true],
["James Johnson","PF",79,"MIA","10s",["PF"],["Style_PaintBeast"],0.6,true,true],
["Jarred Vanderbilt","PF",79,"MIN","20s",["PF","SF"],["Style_PaintBeast"],0.75,true,true],
["Jarrett Jack","PG",79,"CLE","10s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Jeff Green","SF",79,"BOS","10s",["SF"],["Style_Lockdown"],0.6,true,true],
["Jeff Teague","PG",79,"MIN","10s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["JJ Redick","SG",79,"PHI","10s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["Joe Harris","SG",79,"BKN","20s",["SG"],["Style_Sharpshooter"],0.75,true,true],
["Joel Przybilla","C",79,"POR","00s",["C"],["Style_PaintBeast"],0.45,true,true],
["Jordan Clarkson","SG",80,"UTA","20s",["SG"],["Style_Sharpshooter"],0.75,true,true],
["Kenny Thomas","PF",79,"SAC","00s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Kentavious Caldwell-Pope","SG",79,"LAL","10s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["Kurt Thomas","C",79,"PHX","00s",["C"],["Style_PaintBeast"],0.45,true,true],
["Kyle Anderson","SG",79,"MEM","20s",["SG"],["Style_Sharpshooter"],0.75,true,true],
["Larry Nance Jr.","PF",79,"CLE","20s",["PF","C"],["Style_PaintBeast"],0.75,true,true],
["Larry Sanders","C",79,"MIL","10s",["C"],["Style_Lockdown"],0.6,true,true],
["Lindsey Hunter","PG",79,"MIL","00s",["PG"],["Style_Lockdown"],0.45,true,true],
["Luis Scola","PF",79,"IND","10s",["PF"],["Style_PaintBeast"],0.6,true,true],
["Marcus Banks","PG",79,"BOS","00s",["PG"],["Style_FloorGeneral"],0.45,true,true],
["Mark Blount","C",79,"MIN","00s",["C"],["Style_Sharpshooter"],0.45,true,true],
["Marvin Williams","SF",79,"ATL","00s",["SF"],["Style_Lockdown"],0.45,true,true],
["Mason Plumlee","C",79,"CHA","20s",["C"],["Style_PaintBeast"],0.75,true,true],
["Nicolas Batum","SG",79,"CHA","10s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["OG Anunoby","SF",88,"NYK","20s",["SF"],["Style_Sharpshooter","Style_Lockdown"],0.75,true,true],
["Patrick Beverley","SG",79,"LAC","10s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["Rafer Alston","PG",79,"HOU","00s",["PG"],["Style_FloorGeneral"],0.45,true,true],
["Richaun Holmes","C",79,"SAC","20s",["C"],["Style_PaintBeast"],0.75,true,true],
["Ricky Rubio","PG",79,"MIN","20s",["PG"],["Style_FloorGeneral"],0.75,true,true],
["Robert Covington","SF",79,"POR","20s",["SF"],["Style_FlightClub"],0.75,true,true],
["Rui Hachimura","PF",80,"WAS","20s",["PF","SF"],["Style_PaintBeast"],0.75,true,true],
["Thaddeus Young","PF",79,"TOR","20s",["PF"],["Style_PaintBeast"],0.75,true,true],
["Thomas Bryant","C",79,"WAS","20s",["C","PF"],["Style_PaintBeast"],0.75,true,true],
["Trenton Hassell","SG",79,"MIN","00s",["SG"],["Style_Lockdown"],0.45,true,true],
["Trevor Ariza","SF",79,"NOP","10s",["SF"],["Style_Lockdown"],0.6,true,true],
["Tristan Thompson","C",79,"BOS","20s",["C"],["Style_PaintBeast"],0.75,true,true],
["Will Barton","SG",79,"DEN","20s",["SG"],["Style_Sharpshooter"],0.75,true,true],
["Aron Baynes","C",78,"TOR","20s",["C"],["Style_PaintBeast"],0.7,true,true],
["Bobby Simmons","SF",78,"MIL","00s",["SF"],["Style_Lockdown"],0.4,true,true],
["Carlos Delfino","SG",78,"TOR","00s",["SG"],["Style_Lockdown"],0.4,true,true],
["Chucky Atkins","PG",78,"DET","00s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Coby White","PG",83,"CHI","20s",["PG","SG"],["Style_FloorGeneral"],0.7,true,true],
["Cody Zeller","PF",78,"POR","20s",["PF"],["Style_PaintBeast"],0.7,true,true],
["Daniel Gafford","C",80,"WAS","20s",["C","PF"],["Style_PaintBeast"],0.7,true,true],
["Dario Saric","PF",78,"PHI","10s",["PF"],["Style_PaintBeast"],0.55,true,true],
["Dillon Brooks","SF",79,"MEM","20s",["SF","SG"],["Style_FlightClub"],0.7,true,true],
["Duncan Robinson","SF",78,"MIA","20s",["SF","SG"],["Style_FlightClub"],0.7,true,true],
["Gerald Green","SG",78,"PHX","10s",["SG"],["Style_FlightClub"],0.55,true,true],
["Gerald Henderson","SG",78,"CHA","10s",["SG"],["Style_FlightClub"],0.55,true,true],
["Immanuel Quickley","PG",81,"NYK","20s",["PG","SG"],["Style_FloorGeneral"],0.7,true,true],
["Isaiah Stewart","C",78,"DET","20s",["C","PF"],["Style_PaintBeast"],0.7,true,true],
["Ivica Zubac","C",85,"LAC","20s",["C"],["Style_PaintBeast"],0.7,true,true],
["Jamario Moon","SF",78,"TOR","00s",["SF"],["Style_FlightClub"],0.4,true,true],
["Jared Sullinger","PF",78,"BOS","10s",["PF"],["Style_PaintBeast"],0.55,true,true],
["Jason Kapono","SF",78,"TOR","00s",["SF"],["Style_Sharpshooter"],0.4,true,true],
["JaVale McGee","C",78,"DEN","20s",["C"],["Style_PaintBeast"],0.7,true,true],
["Jeremy Lamb","SG",78,"SAC","20s",["SG"],["Style_Sharpshooter"],0.7,true,true],
["Josh Jackson","SF",78,"PHX","10s",["SF","SG"],["Style_FlightClub"],0.55,true,true],
["Kelly Olynyk","C",79,"DET","20s",["C"],["Style_PaintBeast"],0.7,true,true],
["Kendrick Nunn","PG",78,"WAS","20s",["PG","SG"],["Style_FloorGeneral"],0.7,true,true],
["Luguentz Dort","SG",81,"OKC","20s",["SG","SF"],["Style_Sharpshooter"],0.7,true,true],
["Luke Kennard","SG",78,"LAC","20s",["SG","SF"],["Style_Sharpshooter"],0.7,true,true],
["Luke Ridnour","PG",78,"OKC","00s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Marcus Morris Sr.","PF",78,"LAC","20s",["PF","SF"],["Style_PaintBeast"],0.7,true,true],
["Markieff Morris","PF",78,"WAS","10s",["PF"],["Style_PaintBeast"],0.55,true,true],
["Marko Jaric","PG",78,"MIN","00s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Marquis Daniels","SG",78,"DAL","00s",["SG"],["Style_FlightClub"],0.4,true,true],
["Miles Bridges","PF",81,"CHA","20s",["PF","SF"],["Style_PaintBeast"],0.7,true,true],
["Miles Plumlee","C",78,"MIL","10s",["C"],["Style_PaintBeast"],0.55,true,true],
["Monte Morris","PG",78,"DEN","20s",["PG","SG"],["Style_FloorGeneral"],0.7,true,true],
["Nemanja Bjelica","PF",78,"MIA","20s",["PF"],["Style_PaintBeast"],0.7,true,true],
["Nerlens Noel","C",78,"NYK","20s",["C"],["Style_PaintBeast"],0.7,true,true],
["Nick Young","SG",78,"LAL","10s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["PJ Washington","PF",80,"CHA","20s",["PF","SF"],["Style_PaintBeast"],0.7,true,true],
["Rodney Hood","SG",78,"CLE","10s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["Ryan Anderson","PF",78,"HOU","10s",["PF"],["Style_Sharpshooter"],0.55,true,true],
["Saddiq Bey","SF",78,"DET","20s",["SF","PF"],["Style_FlightClub"],0.7,true,true],
["Sebastian Telfair","PG",78,"POR","00s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Seth Curry","PG",78,"PHI","20s",["PG"],["Style_FloorGeneral"],0.7,true,true],
["T.J. McConnell","PG",80,"IND","20s",["PG"],["Style_FloorGeneral"],0.7,true,true],
["Terrence Ross","SF",78,"ORL","20s",["SF"],["Style_FlightClub"],0.7,true,true],
["Troy Brown Jr.","SF",78,"CHI","20s",["SF","SG"],["Style_FlightClub"],0.7,true,true],
["Vladimir Radmanovic","PF",78,"LAL","00s",["PF"],["Style_Sharpshooter"],0.4,true,true],
["Wesley Matthews","SG",78,"POR","10s",["SG"],["Style_Lockdown"],0.55,true,true],
["Al Thornton","PF",77,"LAC","00s",["PF"],["Style_FlightClub"],0.35,true,true],
["Alec Burks","SG",77,"NYK","20s",["SG"],["Style_Sharpshooter"],0.65,true,true],
["Amir Johnson","PF",77,"TOR","10s",["PF"],["Style_PaintBeast"],0.5,true,true],
["Anderson Varejao","C",77,"CLE","00s",["C"],["Style_PaintBeast"],0.35,true,true],
["Anthony Johnson","PG",77,"IND","00s",["PG"],["Style_FloorGeneral"],0.35,true,true],
["Bruce Brown","SG",80,"BKN","20s",["SG","SF"],["Style_Sharpshooter"],0.65,true,true],
["Cameron Johnson","SF",83,"PHX","20s",["SF","PF"],["Style_FlightClub"],0.65,true,true],
["Chris Duhon","PG",77,"CHI","00s",["PG"],["Style_FloorGeneral"],0.35,true,true],
["Cole Anthony","PG",79,"ORL","20s",["PG","SG"],["Style_FloorGeneral"],0.65,true,true],
["Daniel Gibson","PG",77,"CLE","00s",["PG"],["Style_Sharpshooter"],0.35,true,true],
["Dewayne Dedmon","C",77,"ATL","10s",["C"],["Style_PaintBeast"],0.5,true,true],
["Elfrid Payton","PG",77,"NYK","20s",["PG"],["Style_FloorGeneral"],0.65,true,true],
["Etan Thomas","C",77,"WAS","00s",["C"],["Style_PaintBeast"],0.35,true,true],
["Fabricio Oberto","PF",77,"SAS","00s",["PF"],["Style_PaintBeast"],0.35,true,true],
["Facundo Campazzo","PG",77,"DEN","20s",["PG","SG"],["Style_FloorGeneral"],0.65,true,true],
["Gary Trent Jr.","SG",79,"TOR","20s",["SG","SF"],["Style_Sharpshooter"],0.65,true,true],
["Hakim Warrick","PF",77,"MEM","00s",["PF"],["Style_FlightClub"],0.35,true,true],
["Jae'Sean Tate","SF",77,"HOU","20s",["SF","PF"],["Style_FlightClub"],0.65,true,true],
["Jakob Poeltl","C",81,"SAS","20s",["C"],["Style_PaintBeast"],0.65,true,true],
["Jalen Suggs","SG",82,"ORL","20s",["SG","PG"],["Style_Sharpshooter"],0.65,true,true],
["James Wiseman","C",78,"DET","20s",["C","PF"],["Style_PaintBeast"],0.65,true,true],
["Jarron Collins","C",77,"UTA","00s",["C"],["Style_PaintBeast"],0.35,true,true],
["Jason Maxiell","C",77,"DET","00s",["C"],["Style_PaintBeast"],0.35,true,true],
["Josh Hart","SG",82,"POR","20s",["SG","SF"],["Style_Sharpshooter"],0.65,true,true],
["Justise Winslow","SF",77,"MEM","20s",["SF"],["Style_FlightClub"],0.65,true,true],
["Kevin Huerter","SG",80,"ATL","20s",["SG","SF"],["Style_Sharpshooter"],0.65,true,true],
["Kevin Porter Jr.","SG",78,"HOU","20s",["SG","PG"],["Style_Sharpshooter"],0.65,true,true],
["Kyle Kuzma","PF",83,"WAS","20s",["PF","SF"],["Style_PaintBeast"],0.65,true,true],
["Martell Webster","SF",77,"POR","00s",["SF"],["Style_Sharpshooter"],0.35,true,true],
["Michael Kidd-Gilchrist","SF",77,"CHA","10s",["SF"],["Style_FlightClub"],0.5,true,true],
["Milos Teodosic","PG",77,"LAC","10s",["PG","SG"],["Style_FloorGeneral"],0.5,true,true],
["Moses Brown","C",77,"CLE","20s",["C","PF"],["Style_PaintBeast"],0.65,true,true],
["Nenad Krstic","C",77,"BKN","00s",["C"],["Style_PaintBeast"],0.35,true,true],
["Robin Lopez","C",77,"POR","10s",["C"],["Style_PaintBeast"],0.5,true,true],
["Ryan Gomes","PF",77,"MIN","00s",["PF"],["Style_Sharpshooter"],0.35,true,true],
["Shannon Brown","SG",77,"PHX","10s",["SG"],["Style_FlightClub"],0.5,true,true],
["Terance Mann","SG",77,"LAC","20s",["SG","SF"],["Style_Sharpshooter"],0.65,true,true],
["Terrence Jones","PF",77,"HOU","10s",["PF"],["Style_PaintBeast"],0.5,true,true],
["Tiago Splitter","C",77,"SAS","10s",["C"],["Style_PaintBeast"],0.5,true,true],
["Tyler Johnson","PG",77,"MIA","10s",["PG"],["Style_FloorGeneral"],0.5,true,true],
["Tyrus Thomas","PF",77,"CHI","00s",["PF"],["Style_Lockdown"],0.35,true,true],
["Willie Cauley-Stein","C",77,"DAL","20s",["C"],["Style_PaintBeast"],0.65,true,true],
["Willy Hernangomez","C",77,"CHA","10s",["C"],["Style_PaintBeast"],0.5,true,true],
["Aaron Holiday","PG",76,"IND","20s",["PG","SG"],["Style_FloorGeneral"],0.6,true,true],
["Alex Caruso","PG",82,"CHI","20s",["PG","SG"],["Style_FloorGeneral"],0.6,true,true],
["Alex Len","C",76,"SAC","20s",["C"],["Style_PaintBeast"],0.6,true,true],
["Andre Roberson","SF",76,"OKC","10s",["SF"],["Style_FlightClub"],0.45,true,true],
["Anthony Bennett","PF",76,"CLE","10s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Bismack Biyombo","C",76,"CHA","20s",["C"],["Style_PaintBeast"],0.6,true,true],
["Brian Skinner","PF",76,"LAC","00s",["PF"],["Style_Lockdown"],0.3,true,true],
["Cam Reddish","SF",76,"NYK","20s",["SF","SG"],["Style_FlightClub"],0.6,true,true],
["Cameron Payne","PG",76,"PHX","20s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Carl Landry","PF",76,"SAC","10s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Charlie Bell","SG",76,"MIL","00s",["SG"],["Style_Lockdown"],0.3,true,true],
["Chris Wilcox","PF",76,"OKC","00s",["PF"],["Style_FlightClub"],0.3,true,true],
["Courtney Lee","SG",76,"MEM","10s",["SG"],["Style_Lockdown"],0.45,true,true],
["Danuel House Jr.","SG",76,"HOU","20s",["SG","SF"],["Style_Sharpshooter"],0.6,true,true],
["Darko Milicic","C",76,"MEM","00s",["C"],["Style_Lockdown"],0.3,true,true],
["David Nwaba","SG",76,"HOU","20s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["Davion Mitchell","SG",77,"SAC","20s",["SG","PG"],["Style_Sharpshooter"],0.6,true,true],
["Delon Wright","PG",77,"ATL","20s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Dennis Smith Jr.","PG",76,"DAL","10s",["PG","SG"],["Style_FloorGeneral"],0.45,true,true],
["Denzel Valentine","SG",76,"CHI","20s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["DeShawn Stevenson","SG",76,"WAS","00s",["SG"],["Style_Lockdown"],0.3,true,true],
["Desmond Bane","PG",86,"MEM","20s",["PG","SG"],["Style_FloorGeneral"],0.6,true,true],
["Dorian Finney-Smith","PF",77,"DAL","20s",["PF"],["Style_PaintBeast"],0.6,true,true],
["Doug McDermott","SF",76,"SAS","20s",["SF"],["Style_FlightClub"],0.6,true,true],
["Dwight Powell","C",76,"DAL","20s",["C"],["Style_PaintBeast"],0.6,true,true],
["Eddie House","PG",76,"BOS","00s",["PG"],["Style_Sharpshooter"],0.3,true,true],
["Ersan Ilyasova","PF",76,"UTA","20s",["PF"],["Style_PaintBeast"],0.6,true,true],
["Frank Kaminsky III","C",76,"PHX","20s",["C"],["Style_PaintBeast"],0.6,true,true],
["Gorgui Dieng","PF",76,"MIN","10s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Greivis Vasquez","PG",76,"TOR","10s",["PG"],["Style_FloorGeneral"],0.45,true,true],
["Jahlil Okafor","C",76,"DET","20s",["C"],["Style_PaintBeast"],0.6,true,true],
["JaMychal Green","PF",76,"DEN","20s",["PF"],["Style_PaintBeast"],0.6,true,true],
["Jaxson Hayes","C",76,"NOP","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["Jeff Foster","C",76,"IND","00s",["C"],["Style_PaintBeast"],0.3,true,true],
["John Salmons","SG",76,"SAC","00s",["SG"],["Style_Lockdown"],0.3,true,true],
["Jordan Crawford","SG",76,"GSW","10s",["SG"],["Style_Sharpshooter"],0.45,true,true],
["Jordan Hill","C",76,"LAL","10s",["C"],["Style_PaintBeast"],0.45,true,true],
["Jordan Poole","SG",82,"GSW","20s",["SG","PG"],["Style_Sharpshooter"],0.6,true,true],
["Khem Birch","C",76,"TOR","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["KJ Martin","SF",76,"HOU","20s",["SF"],["Style_FlightClub"],0.6,true,true],
["Kris Dunn","PG",76,"ATL","20s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Kwame Brown","C",76,"LAL","00s",["C"],["Style_PaintBeast"],0.3,true,true],
["Leon Powe","C",76,"BOS","00s",["C"],["Style_PaintBeast"],0.3,true,true],
["Linas Kleiza","SF",76,"DEN","00s",["SF"],["Style_Sharpshooter"],0.3,true,true],
["Luc Richard Mbah a Moute","SF",76,"HOU","10s",["SF"],["Style_FlightClub"],0.45,true,true],
["Luke Walton","SF",76,"LAL","00s",["SF"],["Style_FloorGeneral"],0.3,true,true],
["Malik Monk","SG",82,"LAL","20s",["SG","PG"],["Style_Sharpshooter"],0.6,true,true],
["Marcus Thornton","SG",76,"PHX","10s",["SG"],["Style_Sharpshooter"],0.45,true,true],
["Marquese Chriss","PF",76,"GSW","20s",["PF"],["Style_PaintBeast"],0.6,true,true],
["Matt Barnes","SF",76,"LAC","10s",["SF"],["Style_Lockdown"],0.45,true,true],
["Maxi Kleber","PF",76,"DAL","20s",["PF","C"],["Style_PaintBeast"],0.6,true,true],
["Melvin Ely","PF",76,"CHA","00s",["PF"],["Style_PaintBeast"],0.3,true,true],
["Mo Bamba","C",76,"ORL","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["Moritz Wagner","C",77,"ORL","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["Naz Reid","C",83,"CHA","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["Nic Claxton","C",84,"BKN","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["Nikola Mirotic","PF",76,"NOP","10s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Obi Toppin","PF",80,"NYK","20s",["PF","SF"],["Style_PaintBeast"],0.6,true,true],
["Omer Asik","C",76,"NOP","10s",["C"],["Style_PaintBeast"],0.45,true,true],
["Onyeka Okongwu","C",82,"ATL","20s",["C","PF"],["Style_PaintBeast"],0.6,true,true],
["Oshae Brissett","SF",76,"IND","20s",["SF","SG"],["Style_FlightClub"],0.6,true,true],
["P.J. Tucker","SF",76,"MIL","20s",["SF"],["Style_FlightClub"],0.6,true,true],
["Payton Pritchard","SG",80,"BOS","20s",["SG","PG"],["Style_Sharpshooter"],0.6,true,true],
["Ramon Sessions","SG",76,"CHA","10s",["SG"],["Style_FloorGeneral"],0.45,true,true],
["Rasual Butler","SF",76,"NOP","00s",["SF"],["Style_Sharpshooter"],0.3,true,true],
["Rondae Hollis-Jefferson","SF",76,"POR","20s",["SF"],["Style_FlightClub"],0.6,true,true],
["Royce O'Neale","SF",76,"UTA","20s",["SF","PF"],["Style_FlightClub"],0.6,true,true],
["Sean Williams","C",76,"BKN","00s",["C"],["Style_Lockdown"],0.3,true,true],
["Shabazz Napier","PG",76,"WAS","20s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Shake Milton","SG",76,"PHI","20s",["SG","PG"],["Style_Sharpshooter"],0.6,true,true],
["Skal Labissiere","PF",76,"SAC","10s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Spencer Hawes","PF",76,"LAC","10s",["PF"],["Style_Sharpshooter"],0.45,true,true],
["Talen Horton-Tucker","PG",78,"LAL","20s",["PG","SG"],["Style_FloorGeneral"],0.6,true,true],
["Terence Davis","SG",76,"SAC","20s",["SG","SF"],["Style_Sharpshooter"],0.6,true,true],
["Terrence Williams","SF",76,"BOS","10s",["SF"],["Style_FlightClub"],0.45,true,true],
["Tomas Satoransky","SG",76,"CHI","20s",["SG"],["Style_Sharpshooter"],0.6,true,true],
["Tony Battie","C",76,"BOS","00s",["C"],["Style_PaintBeast"],0.3,true,true],
["Torrey Craig","SF",76,"PHX","20s",["SF","PF"],["Style_FlightClub"],0.6,true,true],
["Treveon Graham","SG",76,"CHA","10s",["SG"],["Style_Sharpshooter"],0.45,true,true],
["Trevor Booker","PF",76,"IND","10s",["PF"],["Style_PaintBeast"],0.45,true,true],
["Trey Burke","PG",76,"DAL","20s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Tyus Jones","PG",79,"MEM","20s",["PG"],["Style_FloorGeneral"],0.6,true,true],
["Xavier Tillman","SF",77,"MEM","20s",["SF","PF"],["Style_FlightClub"],0.6,true,true],
["Zaza Pachulia","C",76,"GSW","10s",["C"],["Style_PaintBeast"],0.45,true,true],
["Abdel Nader","SF",75,"PHX","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["Al-Farouq Aminu","SF",75,"CHI","20s",["SF"],["Style_FlightClub"],0.55,true,true],
["Alan Williams","C",75,"PHX","10s",["C"],["Style_PaintBeast"],0.4,true,true],
["Allen Crabbe","SG",75,"BKN","10s",["SG"],["Style_Sharpshooter"],0.4,true,true],
["Allonzo Trier","SG",75,"NYK","20s",["SG","PG"],["Style_Sharpshooter"],0.55,true,true],
["Amir Coffey","SF",75,"LAC","20s",["SF","SG"],["Style_FlightClub"],0.55,true,true],
["Anfernee Simons","PG",83,"POR","20s",["PG","SG"],["Style_FloorGeneral"],0.55,true,true],
["Anthony Carter","PG",75,"MIA","00s",["PG"],["Style_FloorGeneral"],0.25,true,true],
["Avery Johnson","PG",75,"SAS","00s",["PG"],["Style_FloorGeneral"],0.25,true,true],
["Beno Udrih","PG",75,"SAC","00s",["PG"],["Style_FloorGeneral"],0.25,true,true],
["Boban Marjanovic","C",75,"DAL","20s",["C"],["Style_PaintBeast"],0.55,true,true],
["Brandan Wright","PF",75,"PHX","10s",["PF"],["Style_FlightClub"],0.4,true,true],
["Brandon Bass","PF",75,"BOS","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Brandon Williams","SF",80,"POR","20s",["SF"],["Style_FlightClub"],0.55,true,true],
["Bryn Forbes","SG",75,"DEN","20s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["Carlos Arroyo","PG",75,"ORL","00s",["PG"],["Style_FloorGeneral"],0.25,true,true],
["Cedi Osman","SF",75,"CLE","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["Chandler Hutchison","SG",75,"WAS","20s",["SG","SF"],["Style_Sharpshooter"],0.55,true,true],
["Chris Andersen","C",75,"MIA","10s",["C"],["Style_PaintBeast"],0.4,true,true],
["Chuma Okeke","PF",75,"ORL","20s",["PF","SF"],["Style_PaintBeast"],0.55,true,true],
["Corey Brewer","SF",75,"HOU","10s",["SF"],["Style_Lockdown"],0.4,true,true],
["Cory Joseph","SG",75,"DET","20s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["Darius Bazley","PF",75,"OKC","20s",["PF","SF"],["Style_PaintBeast"],0.55,true,true],
["De'Anthony Melton","SG",78,"MEM","20s",["SG","PG"],["Style_Sharpshooter"],0.55,true,true],
["Dee Brown","PG",75,"UTA","00s",["PG"],["Style_FlightClub"],0.25,true,true],
["DeMarre Carroll","SF",75,"BKN","10s",["SF"],["Style_FlightClub"],0.4,true,true],
["Deni Avdija","SF",88,"POR","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["Derrick Jones Jr.","SF",77,"POR","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["DeSagana Diop","C",75,"DAL","00s",["C"],["Style_Lockdown"],0.25,true,true],
["Devin Brown","SG",75,"CLE","00s",["SG"],["Style_Lockdown"],0.25,true,true],
["Earl Boykins","PG",75,"MIL","00s",["PG"],["Style_FloorGeneral"],0.25,true,true],
["Edmond Sumner","SG",75,"IND","20s",["SG","PG"],["Style_Sharpshooter"],0.55,true,true],
["Francisco Elson","C",75,"SAS","00s",["C"],["Style_PaintBeast"],0.25,true,true],
["Francisco Garcia","SF",75,"SAC","00s",["SF"],["Style_Lockdown"],0.25,true,true],
["Furkan Korkmaz","SF",75,"PHI","20s",["SF","SG"],["Style_FlightClub"],0.55,true,true],
["Gary Neal","SG",75,"MIN","10s",["SG"],["Style_Sharpshooter"],0.4,true,true],
["Glen Davis","PF",75,"LAC","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Glenn Robinson III","SF",75,"SAC","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["Harry Giles III","PF",75,"POR","20s",["PF","C"],["Style_PaintBeast"],0.55,true,true],
["Ian Mahinmi","C",75,"IND","10s",["C"],["Style_PaintBeast"],0.4,true,true],
["Isaac Okoro","SF",76,"CLE","20s",["SF","SG"],["Style_FlightClub"],0.55,true,true],
["Isaiah Hartenstein","C",84,"LAC","20s",["C","PF"],["Style_PaintBeast"],0.55,true,true],
["Jaden McDaniels","PF",85,"MIN","20s",["PF","SF"],["Style_PaintBeast"],0.55,true,true],
["James Ennis III","SF",75,"ORL","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["James Jones","SF",75,"POR","00s",["SF"],["Style_Sharpshooter"],0.25,true,true],
["Jared Dudley","SF",75,"PHX","10s",["SF"],["Style_Sharpshooter"],0.4,true,true],
["Jason Thompson","PF",75,"SAC","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Jodie Meeks","SG",75,"DET","10s",["SG"],["Style_Sharpshooter"],0.4,true,true],
["John Henson","C",75,"DET","20s",["C"],["Style_PaintBeast"],0.55,true,true],
["Jon Leuer","PF",75,"DET","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Jonathan Kuminga","SF",80,"GSW","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["Jonathon Simmons","SG",75,"ORL","10s",["SG"],["Style_Sharpshooter"],0.4,true,true],
["Jordan McLaughlin","PG",75,"MIN","20s",["PG","SG"],["Style_FloorGeneral"],0.55,true,true],
["Josh Giddey","PG",83,"OKC","20s",["PG","SG"],["Style_FloorGeneral"],0.55,true,true],
["Juan Toscano-Anderson","SF",75,"GSW","20s",["SF","PF"],["Style_FlightClub"],0.55,true,true],
["Juancho Hernangomez","PF",75,"UTA","20s",["PF","SF"],["Style_PaintBeast"],0.55,true,true],
["Justin Holiday","SG",75,"IND","20s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["Kris Humphries","PF",75,"BOS","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Langston Galloway","PG",75,"PHX","20s",["PG"],["Style_FloorGeneral"],0.55,true,true],
["Lonnie Walker IV","SG",76,"SAS","20s",["SG","SF"],["Style_Sharpshooter"],0.55,true,true],
["Marco Belinelli","SG",75,"SAS","10s",["SG"],["Style_Sharpshooter"],0.4,true,true],
["Mario Chalmers","PG",75,"MIA","10s",["PG"],["Style_Lockdown"],0.4,true,true],
["Matisse Thybulle","SG",76,"PHI","20s",["SG","SF"],["Style_Sharpshooter"],0.55,true,true],
["Maurice Evans","SG",75,"LAL","00s",["SG"],["Style_FlightClub"],0.25,true,true],
["Meyers Leonard","PF",75,"MIL","20s",["PF"],["Style_PaintBeast"],0.55,true,true],
["Nate Wolters","PG",75,"MIL","10s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Nazr Mohammed","C",75,"DET","00s",["C"],["Style_PaintBeast"],0.25,true,true],
["Nick Collison","PF",75,"OKC","00s",["PF"],["Style_PaintBeast"],0.25,true,true],
["Nickeil Alexander-Walker","SG",78,"UTA","20s",["SG","PG"],["Style_Sharpshooter"],0.55,true,true],
["Nicolo Melli","PF",75,"DAL","20s",["PF","SF"],["Style_PaintBeast"],0.55,true,true],
["Norris Cole","PG",75,"NOP","10s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Patrick Patterson","PF",75,"OKC","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Patrick Williams","PF",77,"CHI","20s",["PF","SF"],["Style_PaintBeast"],0.55,true,true],
["Precious Achiuwa","PF",76,"TOR","20s",["PF","C"],["Style_PaintBeast"],0.55,true,true],
["Quinton Ross","SG",75,"LAC","00s",["SG"],["Style_Lockdown"],0.25,true,true],
["Raul Neto","PG",75,"WAS","20s",["PG"],["Style_FloorGeneral"],0.55,true,true],
["Saben Lee","SG",75,"DET","20s",["SG","PG"],["Style_Sharpshooter"],0.55,true,true],
["Shabazz Muhammad","SF",75,"MIL","10s",["SF"],["Style_FlightClub"],0.4,true,true],
["Speedy Claxton","PG",75,"NOP","00s",["PG"],["Style_FloorGeneral"],0.25,true,true],
["Taurean Prince","SF",75,"ATL","10s",["SF","PF"],["Style_FlightClub"],0.4,true,true],
["Thabo Sefolosha","SF",75,"UTA","10s",["SF"],["Style_FlightClub"],0.4,true,true],
["Thomas Robinson","PF",75,"PHI","10s",["PF"],["Style_PaintBeast"],0.4,true,true],
["Thon Maker","C",75,"MIL","10s",["C"],["Style_PaintBeast"],0.4,true,true],
["Tony Bradley","C",75,"OKC","20s",["C","PF"],["Style_PaintBeast"],0.55,true,true],
["Tony Snell","SG",75,"NOP","20s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["Travis Outlaw","PF",75,"POR","00s",["PF"],["Style_FlightClub"],0.25,true,true],
["Trey Lyles","PF",78,"SAS","20s",["PF"],["Style_PaintBeast"],0.55,true,true],
["Ty Jerome","PG",79,"OKC","20s",["PG","SG"],["Style_FloorGeneral"],0.55,true,true],
["Tyler Ulis","PG",75,"PHX","10s",["PG"],["Style_FloorGeneral"],0.4,true,true],
["Wayne Ellington","SG",75,"LAL","20s",["SG"],["Style_Sharpshooter"],0.55,true,true],
["Zach Collins","C",78,"SAS","20s",["C","PF"],["Style_PaintBeast"],0.55,true,true],
["Walker Kessler","C",83,"UTA","20s",["C"],["Style_PaintBeast"],0.5,true,true],
["Robert Williams III","C",82,"POR","20s",["C"],["Style_PaintBeast"],0.5,true,true],
["Devin Vassell","SG",81,"SAS","20s",["SG","SF"],["Style_Sharpshooter"],0.5,true,true],
["Bennedict Mathurin","SG",80,"IND","20s",["SG","SF"],["Style_Sharpshooter"],0.5,true,true],
["Jaden Ivey","PG",80,"DET","20s",["PG","SG"],["Style_FloorGeneral"],0.5,true,true],
["Keegan Murray","SF",80,"SAC","20s",["SF","PF"],["Style_FlightClub"],0.5,true,true],
["Caleb Martin","SF",79,"MIA","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Gabe Vincent","PG",79,"LAL","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Herbert Jones","SF",82,"NOP","20s",["SF","SG"],["Style_FlightClub"],0.5,true,true],
["Jabari Smith Jr.","PF",80,"HOU","20s",["PF","SF"],["Style_PaintBeast"],0.5,true,true],
["Jalen Duren","C",82,"DET","20s",["C"],["Style_PaintBeast"],0.5,true,true],
["Trey Murphy III","SF",85,"NOP","20s",["SF","SG"],["Style_Sharpshooter","Style_FlightClub"],0.5,true,true],
["Brandon Miller","SF",87,"CHA","20s",["SF","SG"],["Style_FlightClub"],0.5,true,true],
["Jeremy Sochan","PF",78,"SAS","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Kenyon Martin Jr.","PF",78,"LAC","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Max Strus","SG",78,"CLE","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Scoot Henderson","PG",78,"POR","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Shaedon Sharpe","SG",81,"POR","20s",["SG"],["Style_Sharpshooter"],0.5,true,true],
["Tari Eason","SF",80,"HOU","20s",["SF","PF"],["Style_FlightClub"],0.5,true,true],
["Tre Jones","PG",78,"SAS","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Bol Bol","C",77,"PHX","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Corey Kispert","SF",78,"WAS","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Josh Okogie","SG",77,"PHX","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Mark Williams","C",80,"CHA","20s",["C"],["Style_PaintBeast"],0.5,true,true],
["Quentin Grimes","SG",80,"PHI","20s",["SG","SF"],["Style_Sharpshooter"],0.5,true,true],
["Vasilije Micic","PG",77,"OKC","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["AJ Griffin","SF",76,"ATL","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Aaron Nesmith","SF",81,"IND","20s",["SF","PF"],["Style_FlightClub"],0.5,true,true],
["Aleksej Pokusevski","PF",76,"OKC","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Amen Thompson","PG",87,"HOU","20s",["PG","SG"],["Style_FloorGeneral"],0.85,true,true],
["Andrew Nembhard","PG",81,"IND","20s",["PG","SG"],["Style_FloorGeneral"],0.5,true,true],
["Ausar Thompson","SG",86,"DET","20s",["SG","SF"],["Style_Sharpshooter"],0.5,true,true],
["Cam Thomas","SG",81,"BKN","20s",["SG"],["Style_Sharpshooter"],0.5,true,true],
["Christian Braun","SG",80,"DEN","20s",["SG","SF"],["Style_Sharpshooter"],0.5,true,true],
["Drew Eubanks","C",76,"PHX","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Grant Williams","PF",76,"CHA","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Isaiah Joe","SG",78,"OKC","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Jaden Hardy","SG",76,"DAL","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Jalen McDaniels","PF",76,"TOR","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Jalen Smith","PF",77,"CHI","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Jaylen Nowell","SG",76,"MEM","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Jordan Nwora","SF",76,"IND","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Jose Alvarado","PG",77,"NYK","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Josh Green","SG",76,"DAL","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Kenrich Williams","SF",76,"OKC","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Malaki Branham","SG",76,"SAS","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Nick Richards","C",77,"PHX","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Ochai Agbaji","SG",76,"UTA","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Paul Reed","PF",76,"PHI","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Reggie Bullock Jr.","SF",76,"HOU","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Trendon Watford","PF",76,"BKN","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Bones Hyland","PG",75,"LAC","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Charles Bassey","C",75,"SAS","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Chimezie Metu","PF",75,"PHX","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Chris Duarte","SG",75,"SAC","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Damion Lee","SG",75,"PHX","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Dyson Daniels","SG",83,"ATL","20s",["SG","PG"],["Style_Sharpshooter"],0.5,true,true],
["Isaiah Jackson","C",76,"IND","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Jalen Johnson","SF",89,"ATL","20s",["SF","PF"],["Style_FlightClub"],0.5,true,true],
["Javonte Green","SF",75,"CHI","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Jeremiah Robinson-Earl","PF",75,"NOP","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Jevon Carter","PG",75,"CHI","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Keita Bates-Diop","SF",75,"BKN","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Killian Hayes","PG",75,"DET","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Landry Shamet","SG",75,"WAS","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Mike Muscala","C",75,"OKC","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Naji Marshall","SF",81,"DAL","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Nassir Little","SF",75,"PHX","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Pat Connaughton","SG",75,"MIL","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Santi Aldama","PF",78,"MEM","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Sasha Vezenkov","PF",75,"SAC","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Tre Mann","PG",76,"CHA","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Aaron Wiggins","SG",78,"OKC","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Ayo Dosunmu","SG",78,"CHI","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Bruno Fernando","C",74,"ATL","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Cody Martin","SF",74,"CHA","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Goga Bitadze","C",75,"ORL","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Haywood Highsmith","SF",74,"MIA","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Isaiah Livers","PF",74,"DET","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Jarace Walker","PF",74,"IND","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Jericho Sims","C",74,"NYK","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Jock Landale","C",76,"HOU","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Josh Primo","SG",74,"LAC","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Miles McBride","PG",76,"NYK","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Omer Yurtseven","C",74,"UTA","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Dereck Lively II","C",81,"DAL","20s",["C"],["Style_PaintBeast"],0.5,true,true],
["Brandin Podziemski","SG",79,"GSW","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Jaime Jaquez Jr.","SF",79,"MIA","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Cam Whitmore","SF",78,"HOU","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Keyonte George","PG",87,"UTA","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Tyson Etienne","SG",78,"BKN","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Bilal Coulibaly","SG",78,"WAS","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Keon Ellis","SG",77,"SAC","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Vince Williams Jr.","SG",77,"MEM","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Cason Wallace","PG",83,"OKC","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Gradey Dick","SG",78,"TOR","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Luke Kornet","C",76,"BOS","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Moses Moody","SG",77,"GSW","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Nikola Jovic","PF",76,"MIA","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Simone Fontecchio","SF",76,"DET","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Taylor Hendricks","PF",76,"UTA","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Trayce Jackson-Davis","C",76,"GSW","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Alex Sarr","PF",81,"WAS","20s",["PF","C"],["Style_PaintBeast"],0.5,true,true],
["Dalano Banton","PG",75,"POR","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Dante Exum","PG",75,"DAL","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Peyton Watson","SF",75,"DEN","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Sam Hauser","SF",76,"BOS","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Zaccharie Risacher","SF",80,"ATL","20s",["SF","SG"],["Style_FlightClub"],0.5,true,true],
["Anthony Black","PG",78,"ORL","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Day'Ron Sharpe","C",74,"BKN","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Duop Reath","C",74,"POR","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Guerschon Yabusele","PF",77,"CHI","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Jabari Walker","PF",74,"POR","20s",["PF"],["Style_PaintBeast"],0.12,true,true],
["Jake LaRavia","PF",74,"SAC","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Jordan Goodwin","PG",74,"LAL","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Lamar Stevens","PF",74,"MEM","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Lindy Waters III","SG",74,"DET","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Malachi Flynn","PG",74,"CHA","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Marcus Sasser","PG",74,"DET","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Noah Clowney","PF",74,"BKN","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Sam Merrill","SG",74,"CLE","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Scotty Pippen Jr.","PG",76,"MEM","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Toumani Camara","SF",82,"POR","20s",["SF","PF"],["Style_FlightClub"],0.5,true,true],
["Dalen Terry","SG",73,"CHI","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["David Roddy","PF",73,"HOU","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Donovan Clingan","C",77,"POR","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Georges Niang","PF",74,"ATL","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Jordan Hawkins","SG",74,"NOP","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Julian Champagnie","SF",82,"SAS","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Julian Strawther","SG",74,"DEN","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Kris Murray","SF",73,"POR","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["MarJon Beauchamp","SF",73,"LAC","20s",["SF"],["Style_FlightClub"],0.12,true,true],
["Max Christie","SG",75,"DAL","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Cooper Flagg","SF",88,"DAL","20s",["SF","PF"],["Style_FlightClub"],0.5,true,true],
["Stephon Castle","SG",88,"SAS","20s",["SG","PG"],["Style_Sharpshooter"],0.5,true,true],
["Jared McCain","PG",80,"OKC","20s",["PG","SG"],["Style_FloorGeneral"],0.5,true,true],
["Kel'el Ware","C",79,"MIA","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Matas Buzelis","PF",79,"CHI","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Yves Missi","C",79,"NOP","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Zach Edey","C",79,"MEM","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Bub Carrington","PG",78,"WAS","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Dylan Harper","PG",85,"SAS","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Isaiah Collier","PG",78,"UTA","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Kyle Filipowski","C",78,"UTA","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Ace Bailey","SF",77,"UTA","20s",["SF"],["Style_FlightClub"],0.12,true,true],
["Kyshawn George","SF",77,"WAS","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["Dalton Knecht","SG",76,"LAL","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Jay Huff","C",76,"IND","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Jaylen Wells","SF",76,"MEM","20s",["SF","SG"],["Style_FlightClub"],0.12,true,true],
["VJ Edgecombe","SG",83,"PHI","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Brice Sensabaugh","SF",75,"UTA","20s",["SF"],["Style_FlightClub"],0.12,true,true],
["Justin Edwards","SF",75,"PHI","20s",["SF"],["Style_FlightClub"],0.12,true,true],
["Karlo Matkovic","PF",75,"NOP","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Kon Knueppel","SG",86,"CHA","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Ryan Dunn","SF",75,"PHX","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Ryan Rollins","PG",75,"MIL","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Sandro Mamukelashvili","PF",75,"TOR","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Tre Johnson","SG",75,"WAS","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Ziaire Williams","SF",75,"BKN","20s",["SF"],["Style_FlightClub"],0.12,true,true],
["AJ Green","SG",74,"MIL","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["AJ Johnson","SG",74,"DAL","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Adem Bona","C",74,"PHI","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Ben Sheppard","SG",74,"IND","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Dean Wade","PF",74,"CLE","20s",["PF","SF"],["Style_PaintBeast"],0.12,true,true],
["Devin Carter","PG",74,"SAC","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Ja'Kobe Walter","SG",74,"TOR","20s",["SG"],["Style_Sharpshooter"],0.12,true,true],
["Jalen Wilson","SF",74,"BKN","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Jonathan Mogbo","PF",74,"TOR","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Justin Champagnie","SF",74,"WAS","20s",["SF"],["Style_FlightClub"],0.12,true,true],
["Khaman Maluach","C",74,"PHX","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Mouhamed Gueye","PF",74,"ATL","20s",["PF","C"],["Style_PaintBeast"],0.12,true,true],
["Neemias Queta","C",74,"BOS","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Nick Smith Jr.","SG",74,"LAL","20s",["SG","PG"],["Style_Sharpshooter"],0.12,true,true],
["Pelle Larsson","SG",74,"MIA","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Quinten Post","C",74,"GSW","20s",["C"],["Style_PaintBeast"],0.12,true,true],
["Rob Dillingham","PG",74,"CHI","20s",["PG"],["Style_FloorGeneral"],0.12,true,true],
["Ron Holland II","SF",74,"DET","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Tristan da Silva","SF",74,"ORL","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["AJ Lawson","SG",73,"TOR","20s",["SG","SF"],["Style_Sharpshooter"],0.12,true,true],
["Ajay Mitchell","PG",84,"OKC","20s",["PG","SG"],["Style_FloorGeneral"],0.12,true,true],
["Derik Queen","C",73,"NOP","20s",["C","PF"],["Style_PaintBeast"],0.12,true,true],
["Gui Santos","SF",73,"GSW","20s",["SF","PF"],["Style_FlightClub"],0.12,true,true],
["Artis Gilmore","C",93,"CHI","70s",["C"],["Style_PaintBeast"],1,true,false],
["Bob McAdoo","C",94,"LAC","70s",["C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["Sidney Moncrief","SG",94,"MIL","80s",["SG"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Billy Cunningham","SF",93,"PHI","70s",["SF","PF"],["Style_FlightClub","Style_PaintBeast"],1,true,false],
["Hal Greer","SG",92,"PHI","60s",["SG","PG"],["Style_Sharpshooter","Style_Lockdown"],1,true,false],
["Bobby Jones","SF",90,"PHI","80s",["SF","PF"],["Style_Lockdown"],1,true,true],
["Hersey Hawkins","SG",87,"PHI","90s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["George McGinnis","PF",87,"PHI","70s",["PF","C"],["Style_PaintBeast"],1,true,false],
["Doug Collins","SG",87,"PHI","70s",["SG","SF"],["Style_Sharpshooter"],1,true,false],
["Larry Costello","PG",86,"PHI","60s",["PG","SG"],["Style_FloorGeneral"],1,true,false],
["Marques Johnson","SF",92,"MIL","80s",["SF","SG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Ray Allen","SG",91,"MIL","00s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Bob Dandridge","SF",88,"MIL","70s",["SF","SG"],["Style_Sharpshooter","Style_Lockdown"],1,true,false],
["Vin Baker","PF",87,"MIL","90s",["PF"],["Style_PaintBeast"],1,true,true],
["Terry Cummings","PF",87,"MIL","80s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Brian Winters","SG",86,"MIL","70s",["SG"],["Style_Sharpshooter"],1,true,false],
["Bob Lanier","C",86,"MIL","80s",["C"],["Style_PaintBeast"],1,true,true],
["Paul Pressey","SG",84,"MIL","80s",["SG","SF"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Bob Love","PF",89,"CHI","70s",["PF","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,false],
["Jerry Sloan","SG",89,"CHI","70s",["SG","SF"],["Style_Lockdown"],1,true,false],
["B.J. Armstrong","PG",87,"CHI","90s",["PG","SG"],["Style_Sharpshooter"],1,true,true],
["Chet Walker","SF",87,"CHI","70s",["SF","SG"],["Style_Slasher"],1,true,false],
["Reggie Theus","PG",86,"CHI","80s",["PG","SG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Norm Van Lier","PG",86,"CHI","70s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,false],
["Brad Daugherty","C",90,"CLE","90s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Larry Nance","PF",88,"CLE","90s",["PF","SF"],["Style_FlightClub","Style_Lockdown"],1,true,true],
["Terrell Brandon","PG",87,"CLE","90s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Campy Russell","SF",86,"CLE","70s",["SF"],["Style_Sharpshooter"],1,true,false],
["Austin Carr","SG",86,"CLE","70s",["SG"],["Style_Sharpshooter"],1,true,false],
["Bingo Smith","SG",84,"CLE","70s",["SG","SF"],["Style_Sharpshooter"],1,true,false],
["Jim Chones","C",84,"CLE","70s",["C","PF"],["Style_PaintBeast"],1,true,false],
["Jo Jo White","PG",94,"BOS","70s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,false],
["Bill Sharman","SG",92,"BOS","50s",["SG","PG"],["Style_Sharpshooter","Style_Lockdown"],1,true,false],
["World B. Free","SG",89,"LAC","70s",["SG","PG"],["Style_Sharpshooter","Style_FlightClub"],1,true,false],
["Ron Harper","SG",89,"LAC","90s",["SG","PG"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Paul George","SF",89,"LAC","20s",["SF","SG","PF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Randy Smith","SG",88,"LAC","70s",["SG","SF"],["Style_Slasher"],1,true,false],
["Danny Manning","PF",87,"LAC","90s",["PF"],["Style_PaintBeast"],1,true,true],
["Norm Nixon","PG",86,"LAC","80s",["PG"],["Style_FloorGeneral"],1,true,true],
["Swen Nater","C",84,"LAC","80s",["C","PF"],["Style_PaintBeast"],1,true,true],
["Lamar Odom","PF",82,"LAC","00s",["PF","SF","C"],["Style_FloorGeneral"],1,true,true],
["Shareef Abdur-Rahim","PF",86,"MEM","90s",["PF","SF"],["Style_PaintBeast"],1,true,true],
["Mike Bibby","PG",86,"MEM","00s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Jaren Jackson Jr.","PF",87,"MEM","20s",["PF","C"],["Style_Sharpshooter","Style_Lockdown"],0.95,true,true],
["Shane Battier","SF",85,"MEM","00s",["SF","SG","PF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Bryant Reeves","C",84,"MEM","90s",["C"],["Style_PaintBeast"],1,true,true],
["Jason Williams","PG",84,"MEM","00s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Mike Miller","SG",82,"MEM","00s",["SG","SF"],["Style_Sharpshooter"],0.6,true,true],
["Jonas Valanciunas","C",82,"MEM","20s",["C"],["Style_PaintBeast"],0.95,true,true],
["Dikembe Mutombo","C",92,"ATL","90s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Cliff Hagan","SF",91,"ATL","50s",["SF","SG"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["Lou Hudson","SF",91,"ATL","70s",["SF","SG"],["Style_Sharpshooter"],1,true,false],
["Joe Caldwell","SG",88,"ATL","60s",["SG","SF"],["Style_FlightClub","Style_Lockdown"],1,true,false],
["Trae Young","PG",88,"ATL","20s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Kevin Willis","PF",87,"ATL","90s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Pete Maravich","SG",87,"ATL","70s",["SG","PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Mookie Blaylock","PG",86,"ATL","90s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Dan Roundfield","PF",86,"ATL","80s",["PF","C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Tim Hardaway","PG",89,"MIA","90s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Glen Rice","SF",88,"MIA","90s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Rony Seikaly","C",86,"MIA","90s",["C"],["Style_PaintBeast"],1,true,true],
["Eddie Jones","SG",85,"MIA","00s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Steve Smith","SG",85,"MIA","90s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Tyler Herro","SG",85,"MIA","20s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Eddie Jones","SG",89,"CHA","90s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Alonzo Mourning","C",89,"CHA","90s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Derrick Coleman","PF",86,"CHA","00s",["PF","C"],["Style_PaintBeast"],1,true,true],
["LaMelo Ball","PG",86,"CHA","20s",["PG","SG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Anthony Mason","PF",86,"CHA","90s",["PF","C"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Dell Curry","SG",85,"CHA","90s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Kendall Gill","SG",85,"CHA","90s",["SG","SF"],["Style_Slasher"],1,true,true],
["Baron Davis","PG",85,"CHA","00s",["PG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Gerald Wallace","SF",84,"CHA","10s",["SF"],["Style_Lockdown"],0.85,true,true],
["Mark Eaton","C",89,"UTA","80s",["C"],["Style_Lockdown"],1,true,true],
["Donovan Mitchell","SG",88,"UTA","20s",["SG","PG"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Darrell Griffith","SG",87,"UTA","80s",["SG","SF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Thurl Bailey","PF",86,"UTA","80s",["PF","SF"],["Style_Sharpshooter"],1,true,true],
["Truck Robinson","PF",86,"UTA","70s",["PF"],["Style_PaintBeast"],1,true,false],
["Oscar Robertson","PG",97,"SAC","60s",["PG","SG"],["Style_FloorGeneral"],1,true,true],
["Jerry Lucas","PF",95,"SAC","60s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["Nate Archibald","PG",94,"SAC","70s",["PG"],["Style_FloorGeneral","Style_Slasher"],1,true,false],
["Wayne Embry","C",90,"SAC","60s",["C","PF"],["Style_PaintBeast"],1,true,false],
["Otis Birdsong","SG",87,"SAC","80s",["SG"],["Style_Sharpshooter"],1,true,true],
["Eddie Johnson","SF",86,"SAC","80s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Sam Lacey","C",86,"SAC","70s",["C","PF"],["Style_Lockdown","Style_FloorGeneral"],1,true,false],
["Richie Guerin","SG",92,"NYK","60s",["SG","PG"],["Style_FloorGeneral","Style_Slasher"],1,true,false],
["Dave DeBusschere","PF",92,"NYK","70s",["PF","SF"],["Style_Lockdown","Style_PaintBeast"],1,true,false],
["Allan Houston","SG",89,"NYK","00s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Amar'e Stoudemire","PF",89,"NYK","10s",["PF","C"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Gail Goodrich","SG",89,"LAL","70s",["SG","PG"],["Style_Sharpshooter"],1,true,false],
["Hedo Turkoglu","SF",86,"ORL","00s",["SF","PF"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Grant Hill","SF",86,"ORL","00s",["SF","PF","PG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Nick Anderson","SG",85,"ORL","90s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Scott Skiles","PG",84,"ORL","90s",["PG"],["Style_FloorGeneral"],1,true,true],
["Horace Grant","PF",84,"ORL","90s",["PF","C"],["Style_Lockdown"],1,true,true],
["Dennis Scott","SF",84,"ORL","90s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Darrell Armstrong","PG",83,"ORL","90s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Derek Harper","PG",89,"DAL","80s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Rolando Blackman","SG",88,"DAL","80s",["SG"],["Style_Sharpshooter"],1,true,true],
["Mark Aguirre","SF",88,"DAL","80s",["SF","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Jim Jackson","SG",88,"DAL","90s",["SG","SF"],["Style_Sharpshooter"],0.6,true,true],
["Jamal Mashburn","SF",88,"DAL","90s",["SF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Steve Nash","PG",87,"DAL","00s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Jason Kidd","PG",87,"DAL","90s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["James Donaldson","C",85,"DAL","80s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Brad Davis","PG",84,"DAL","80s",["PG"],["Style_FloorGeneral"],1,true,true],
["Tyson Chandler","C",82,"DAL","10s",["C"],["Style_Lockdown"],0.55,true,true],
["Julius Erving","SF",97,"BKN","70s",["SF","PF"],["Style_FlightClub"],1,true,true],
["Kevin Durant","SF",96,"BKN","20s",["SF","PF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Drazen Petrovic","SG",90,"BKN","90s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Vince Carter","SG",90,"BKN","00s",["SG","SF"],["Style_FlightClub"],1,true,true],
["Kyrie Irving","PG",89,"BKN","20s",["PG","SG"],["Style_Slasher","Style_AnkleBreaker"],1,true,true],
["James Harden","SG",89,"BKN","20s",["SG","PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Buck Williams","PF",88,"BKN","80s",["PF","C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Derrick Coleman","PF",88,"BKN","90s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Kenny Anderson","PG",88,"BKN","90s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Brook Lopez","C",87,"BKN","10s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Otis Birdsong","SG",86,"BKN","80s",["SG"],["Style_Sharpshooter"],1,true,true],
["Keith Van Horn","SF",86,"BKN","90s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["David Thompson","SG",95,"DEN","70s",["SG","SF"],["Style_FlightClub"],1,true,false],
["Fat Lever","PG",92,"DEN","80s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Dan Issel","PF",92,"DEN","80s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Kiki VanDeWeghe","SF",89,"DEN","80s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Mahmoud Abdul-Rauf","PG",89,"DEN","90s",["PG","SG"],["Style_Sharpshooter","Style_AnkleBreaker"],1,true,true],
["Byron Beck","PF",89,"DEN","70s",["PF","C"],["Style_PaintBeast"],1,true,false],
["Ralph Simpson","SG",89,"DEN","70s",["SG","SF"],["Style_Sharpshooter","Style_Slasher"],1,true,false],
["Mel Daniels","C",92,"IND","70s",["C","PF"],["Style_PaintBeast"],1,true,false],
["Freddie Lewis","PG",89,"IND","70s",["PG","SG"],["Style_FloorGeneral"],1,true,false],
["George McGinnis","PF",89,"IND","70s",["PF","C"],["Style_PaintBeast"],1,true,false],
["Bob Netolicky","PF",88,"IND","70s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["Rik Smits","C",87,"IND","90s",["C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Chuck Person","SF",87,"IND","80s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["Don Buse","PG",87,"IND","70s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,false],
["Domantas Sabonis","PF",86,"IND","20s",["PF","C"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Baron Davis","PG",92,"NOP","00s",["PG"],["Style_FlightClub","Style_FloorGeneral"],1,true,true],
["Jamal Mashburn","SF",89,"NOP","00s",["SF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["David West","PF",88,"NOP","00s",["PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Jrue Holiday","SG",86,"NOP","10s",["SG","PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["DeMarcus Cousins","C",85,"NOP","10s",["C","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["David Wesley","SG",84,"NOP","00s",["SG"],["Style_Sharpshooter"],1,true,true],
["Ryan Anderson","PF",84,"NOP","10s",["PF"],["Style_Sharpshooter"],0.55,true,true],
["Julius Randle","PF",83,"NOP","10s",["PF"],["Style_PaintBeast","Style_Slasher"],1,true,true],
["Lonzo Ball","PG",82,"NOP","20s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],0.9,true,true],
["Bob Lanier","C",93,"DET","70s",["C"],["Style_PaintBeast"],1,true,false],
["Dave Bing","PG",90,"DET","70s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,false],
["Dave DeBusschere","PF",89,"DET","60s",["PF","SF"],["Style_Lockdown","Style_PaintBeast"],1,true,false],
["Bailey Howell","PF",88,"DET","60s",["PF","SF"],["Style_PaintBeast"],1,true,false],
["Kelly Tripucka","SF",86,"DET","80s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Pascal Siakam","PF",86,"TOR","20s",["PF","SF"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Damon Stoudamire","PG",86,"TOR","90s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Antonio Davis","C",85,"TOR","00s",["C","PF"],["Style_PaintBeast"],1,true,true],
["Tracy McGrady","SG",85,"TOR","00s",["SG","SF","PG"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Doug Christie","SG",84,"TOR","90s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Brandon Ingram","SF",84,"TOR","20s",["SF","SG"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Clyde Drexler","SG",93,"HOU","90s",["SG","SF"],["Style_FlightClub"],1,true,true],
["Calvin Murphy","PG",91,"HOU","70s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,false],
["Ralph Sampson","C",89,"HOU","80s",["C","PF"],["Style_FlightClub","Style_PaintBeast"],1,true,true],
["Elvin Hayes","PF",89,"HOU","70s",["PF","C"],["Style_PaintBeast"],1,true,false],
["Rudy Tomjanovich","SF",88,"HOU","70s",["SF","PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,false],
["Steve Francis","PG",88,"HOU","00s",["PG","SG"],["Style_FlightClub","Style_AnkleBreaker"],1,true,true],
["Kenny Smith","PG",87,"HOU","90s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Otis Thorpe","PF",86,"HOU","90s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Vernon Maxwell","SG",83,"HOU","90s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Louie Dampier","PG",89,"SAS","70s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,false],
["Larry Kenon","SF",88,"SAS","70s",["SF"],["Style_FlightClub","Style_PaintBeast"],1,true,false],
["Sean Elliott","SF",87,"SAS","90s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["James Silas","PG",86,"SAS","70s",["PG","SG"],["Style_FloorGeneral","Style_Slasher"],1,true,false],
["LaMarcus Aldridge","PF",86,"SAS","10s",["PF","C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Mike Mitchell","SF",86,"SAS","80s",["SF","SG"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Johnny Moore","PG",84,"SAS","80s",["PG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Dennis Johnson","PG",94,"PHX","80s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,true],
["Walter Davis","SG",90,"PHX","80s",["SG","SF"],["Style_Sharpshooter","Style_Slasher"],1,true,true],
["Charlie Scott","PG",89,"PHX","70s",["PG","SG"],["Style_FloorGeneral","Style_Slasher"],1,true,false],
["Tom Chambers","PF",89,"PHX","90s",["PF","SF"],["Style_Sharpshooter","Style_FlightClub"],1,true,true],
["Dick Van Arsdale","SG",88,"PHX","70s",["SG","SF"],["Style_Sharpshooter","Style_Slasher"],1,true,false],
["Paul Westphal","SG",88,"PHX","70s",["SG","PG"],["Style_FloorGeneral","Style_Slasher"],1,true,false],
["Dan Majerle","SG",88,"PHX","90s",["SG","SF"],["Style_Sharpshooter","Style_Lockdown"],1,true,true],
["Connie Hawkins","SF",86,"PHX","70s",["SF","PF"],["Style_FlightClub"],1,true,false],
["Alvan Adams","C",85,"PHX","70s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,false],
["Dennis Johnson","PG",91,"OKC","70s",["PG","SG"],["Style_Lockdown","Style_FloorGeneral"],1,true,false],
["Rashard Lewis","PF",89,"OKC","00s",["PF","SF"],["Style_Sharpshooter"],1,true,true],
["Gus Williams","PG",89,"OKC","80s",["PG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Spencer Haywood","PF",89,"OKC","70s",["PF"],["Style_PaintBeast"],1,true,false],
["Jack Sikma","C",89,"OKC","80s",["C"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Fred Brown","PG",88,"OKC","70s",["PG","SG"],["Style_Sharpshooter"],1,true,false],
["Detlef Schrempf","SF",87,"OKC","90s",["SF","PF"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Lenny Wilkens","PG",84,"OKC","70s",["PG"],["Style_FloorGeneral"],1,true,false],
["Kevin Love","PF",91,"MIN","10s",["PF"],["Style_Sharpshooter","Style_PaintBeast"],1,true,true],
["Tom Gugliotta","PF",88,"MIN","90s",["PF","SF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Sam Cassell","PG",88,"MIN","00s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Al Jefferson","C",88,"MIN","00s",["C","PF"],["Style_PaintBeast"],0.95,true,true],
["Jimmy Butler","SG",87,"MIN","10s",["SG","SF","PF"],["Style_Lockdown","Style_Slasher"],1,true,true],
["Stephon Marbury","PG",87,"MIN","90s",["PG"],["Style_FloorGeneral","Style_AnkleBreaker"],1,true,true],
["Terrell Brandon","PG",86,"MIN","00s",["PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Rudy Gobert","C",86,"MIN","20s",["C"],["Style_Lockdown","Style_PaintBeast"],1,true,true],
["Doug West","SG",85,"MIN","90s",["SG","SF"],["Style_FlightClub","Style_Slasher"],1,true,true],
["Wally Szczerbiak","SF",85,"MIN","00s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Christian Laettner","PF",85,"MIN","90s",["PF","C"],["Style_PaintBeast"],1,true,true],
["Andrew Wiggins","SF",83,"MIN","10s",["SF","SG"],["Style_FlightClub"],1,true,true],
["Maurice Lucas","PF",90,"POR","70s",["PF","SF"],["Style_Lockdown","Style_PaintBeast"],1,true,false],
["Geoff Petrie","SG",87,"POR","70s",["SG","PG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,false],
["Jerome Kersey","SF",87,"POR","90s",["SF","PF"],["Style_FlightClub","Style_Lockdown"],1,true,true],
["Terry Porter","PG",87,"POR","90s",["PG","SG"],["Style_Sharpshooter","Style_FloorGeneral"],1,true,true],
["Sidney Wicks","PF",87,"POR","70s",["PF","SF"],["Style_PaintBeast"],1,true,false],
["Kiki VanDeWeghe","SF",86,"POR","80s",["SF","PF"],["Style_Sharpshooter"],1,true,true],
["CJ McCollum","SG",86,"POR","10s",["SG","PG"],["Style_Sharpshooter"],1,true,true],
["Jim Paxson","SG",85,"POR","80s",["SG","PG"],["Style_Slasher"],1,true,true],
["Kevin Duckworth","C",85,"POR","90s",["C","PF"],["Style_PaintBeast"],1,true,true],
["Paul Arizin","SF",91,"GSW","50s",["SF","SG"],["Style_Sharpshooter"],1,true,false],
["Mitch Richmond","SG",88,"GSW","90s",["SG"],["Style_Sharpshooter"],1,true,true],
["Sleepy Floyd","PG",88,"GSW","80s",["PG","SG"],["Style_FloorGeneral","Style_Slasher"],1,true,true],
["Purvis Short","SF",86,"GSW","80s",["SF","SG"],["Style_Sharpshooter"],1,true,true],
["Moses Malone","C",89,"WAS","80s",["C"],["Style_PaintBeast"],1,true,true],
["Earl Monroe","PG",89,"WAS","70s",["PG","SG"],["Style_AnkleBreaker"],1,true,false],
["Phil Chenier","SG",88,"WAS","70s",["SG","PG"],["Style_Sharpshooter","Style_Lockdown"],1,true,false],
["Walt Bellamy","C",88,"WAS","60s",["C"],["Style_PaintBeast"],1,true,false],
["Don Ohl","PG",87,"WAS","60s",["PG","SG"],["Style_Sharpshooter"],1,true,false],
["Jeff Ruland","C",87,"WAS","80s",["C","PF"],["Style_FloorGeneral","Style_PaintBeast"],1,true,true],
["Jeff Malone","SG",86,"WAS","80s",["SG","SF"],["Style_Sharpshooter"],1,true,true],
["Jack Marin","SF",86,"WAS","70s",["SF","SG"],["Style_Sharpshooter"],1,true,false]
];

const TIER_ORDER=["Bronze","Silver","Gold","Elite","Icon"];
function tierOf(o){return o>=96?"Icon":o>=92?"Elite":o>=85?"Gold":o>=75?"Silver":"Bronze";}
/* multi-position eligibility: primary position + secondary/tertiary spots */
const POS_EXTRA={
"LeBron James":["PF","PG","SG","C"],"Magic Johnson":["SG","SF","PF","C"],
"Giannis Antetokounmpo":["SF","C"],"Michael Jordan":["SF"],"Kobe Bryant":["SF"],
"Kevin Durant":["PF"],"Larry Bird":["PF"],"Kawhi Leonard":["PF"],"Scottie Pippen":["PF","SG"],
"Julius Erving":["PF"],"Elgin Baylor":["PF"],"John Havlicek":["SG"],"Rick Barry":["PF"],
"Dominique Wilkins":["PF"],"James Worthy":["PF"],"Carmelo Anthony":["PF"],"Paul Pierce":["PF"],
"Jayson Tatum":["PF"],"Paul George":["SG","PF"],"Jimmy Butler":["SG","PF"],"Grant Hill":["PF","PG"],
"Tracy McGrady":["SF","PG"],"Vince Carter":["SF"],"Clyde Drexler":["SF"],"George Gervin":["SF"],
"Dwyane Wade":["PG"],"James Harden":["PG"],"Allen Iverson":["PG"],"Oscar Robertson":["SG"],
"Jerry West":["SG"],"Stephen Curry":["SG"],"Luka Doncic":["SG","SF"],"Shai Gilgeous-Alexander":["SG"],
"Kyrie Irving":["SG"],"Pete Maravich":["PG"],"Penny Hardaway":["SG"],"Walt Frazier":["SG"],
"Earl Monroe":["PG"],"Russell Westbrook":["SG"],"Anthony Edwards":["SF"],"Donovan Mitchell":["PG"],
"Jaylen Brown":["SF"],"DeMar DeRozan":["SF"],"Devin Booker":["PG"],"Klay Thompson":["SF"],
"Tyrese Haliburton":["SG"],"Cade Cunningham":["SG"],"Tyrese Maxey":["SG"],"Adrian Dantley":["SG"],
"Chris Mullin":["SG"],"Glen Rice":["SG"],"Peja Stojakovic":["SG"],"Andre Iguodala":["SG"],
"Andrew Wiggins":["SG"],"Michael Porter Jr.":["PF"],"Khris Middleton":["SG"],"Shawn Marion":["PF"],
"Metta World Peace":["SG"],"Toni Kukoc":["PF"],"Andrei Kirilenko":["PF"],"Larry Johnson":["SF"],
"Bernard King":["PF"],"Charles Barkley":["SF","C"],
"Tim Duncan":["C"],"Kevin Garnett":["C"],"Dirk Nowitzki":["C"],"Anthony Davis":["C"],
"Chris Bosh":["C"],"Pau Gasol":["C"],"Rasheed Wallace":["C"],"Amar'e Stoudemire":["C"],
"Chris Webber":["C"],"Kevin McHale":["C"],"Elvin Hayes":["C"],"Bob Pettit":["C"],
"LaMarcus Aldridge":["C"],"Evan Mobley":["C"],"Dolph Schayes":["C"],"Draymond Green":["C","SF"],
"Lamar Odom":["SF","C"],"Boris Diaw":["C","SF"],"Karl Malone":["C"],"Shawn Kemp":["C"],
"Dennis Rodman":["C","SF"],"Zach Randolph":["C"],"Horace Grant":["C"],"Zion Williamson":["C"],
"Paolo Banchero":["C","SF"],"Aaron Gordon":["SF","C"],"Robert Horry":["C","SF"],
"Udonis Haslem":["C"],"Matt Bonner":["C"],"Brian Scalabrine":["SF","C"],"Kurt Rambis":["C"],
"Nikola Jokic":["PF"],"Victor Wembanyama":["PF"],"Karl-Anthony Towns":["PF"],"Bam Adebayo":["PF"],
"Domantas Sabonis":["PF"],"Willis Reed":["PF"],"Ben Wallace":["PF"],"Brook Lopez":["PF"],
"Joel Embiid":["PF"],"David Robinson":["PF"],"Dave Cowens":["PF"],"Nate Thurmond":["PF"],
"Wes Unseld":["PF"],"Bill Walton":["PF"],"Arvydas Sabonis":["PF"],"Marc Gasol":["PF"],
"Bill Laimbeer":["PF"],"Vlade Divac":["PF"],"Chet Holmgren":["PF"],"Alperen Sengun":["PF"],
"Kevon Looney":["PF"],
"Jason Kidd":["SG"],"Damian Lillard":["SG"],"De'Aaron Fox":["SG"],"Jamal Murray":["SG"],
"Jrue Holiday":["SG"],"Chauncey Billups":["SG"],"Gilbert Arenas":["SG"],"Dennis Johnson":["SG"],
"Sam Cassell":["SG"],"LaMelo Ball":["SG"],"Joe Dumars":["PG"],"Latrell Sprewell":["SF"],
"Jeff Hornacek":["PG"],"Eddie Jones":["SF"],"CJ McCollum":["PG"],"Zach LaVine":["SF"],
"Tyler Herro":["PG"],"Bradley Beal":["PG"],"Austin Reaves":["PG"],"Jalen Williams":["SG","PF"],
"Franz Wagner":["PF"],"Scottie Barnes":["PF","PG"],"Lou Williams":["PG"],"Jason Terry":["PG"],
"Steve Kerr":["SG"],"John Paxson":["SG"],"Patty Mills":["SG"],"Shaun Livingston":["SG"],
"Nate Robinson":["SG"],"Jeremy Lin":["SG"],"Tony Allen":["SF"],"Danny Green":["SF"],
"Bruce Bowen":["SG"],"Michael Cooper":["SF","PG"],"Doug Christie":["SF"],"Gary Payton II":["PG"],
"JR Smith":["SF"],"Bonzi Wells":["SF"],"Shane Battier":["PF"],"Duncan Robinson":["SG"]};

/* Phase 1 position expansion — historical season roles, with stars hand-locked. */
Object.assign(POS_EXTRA,{"DeMarcus Cousins":["PF"],"Jermaine O'Neal":["PF"],"Elton Brand":["C"],"Gordon Hayward":["SG"],"Joe Johnson":["SF"],"Michael Finley":["SF"],"Pascal Siakam":["SF"],"Victor Oladipo":["PG"],"Antawn Jamison":["SF"],"Antonio McDyess":["C"],"Al Horford":["PF"],"Brandon Ingram":["SG"],"Kristaps Porzingis":["C"],"Rashard Lewis":["PF"],"Al Jefferson":["PF"],"Dejounte Murray":["SG"],"Jerry Stackhouse":["SF"],"Serge Ibaka":["C"],"D'Angelo Russell":["SG"],"Josh Smith":["SF"],"Monta Ellis":["PG"],"Corey Maggette":["SG"],"Eric Bledsoe":["SG"],"Jaren Jackson Jr.":["C"],"RJ Barrett":["SG"],"Tobias Harris":["SF"],"Collin Sexton":["SG"],"Jonathan Isaac":["SF"],"Larry Hughes":["PG"],"Lonzo Ball":["SG"],"Mikal Bridges":["SG"],"Kelly Oubre Jr.":["SG"],"Lance Stephenson":["SF"],"Leandro Barbosa":["PG"],"Marvin Bagley III":["C"],"Mitchell Robinson":["PF"],"Bogdan Bogdanovic":["SF"],"Brandon Clarke":["SF"],"De'Andre Hunter":["PF"],"Derrick Favors":["C"],"Grayson Allen":["PG"],"Keldon Johnson":["SG"],"Lauri Markkanen":["C"],"Markelle Fultz":["SG"],"Otto Porter Jr.":["SF"],"Tim Hardaway Jr.":["SF"],"Wendell Carter Jr.":["PF"],"Chris Boucher":["C"],"Daniel Theis":["PF"],"Derrick White":["SG"],"Devonte' Graham":["SG"],"Donte DiVincenzo":["PG"],"Eric Paschall":["SF"],"Jalen Green":["SG"],"Jarred Vanderbilt":["SF"],"Larry Nance Jr.":["C"],"Rui Hachimura":["SF"],"Thomas Bryant":["PF"],"Coby White":["SG"],"Daniel Gafford":["PF"],"Dillon Brooks":["SG"],"Duncan Robinson":["SG"],"Immanuel Quickley":["SG"],"Isaiah Stewart":["PF"],"Josh Jackson":["SG"],"Kendrick Nunn":["SG"],"Luguentz Dort":["SF"],"Luke Kennard":["SF"],"Marcus Morris Sr.":["SF"],"Miles Bridges":["SF"],"Monte Morris":["SG"],"PJ Washington":["SF"],"Saddiq Bey":["PF"],"Troy Brown Jr.":["SG"],"Bruce Brown":["SF"],"Cameron Johnson":["PF"],"Cole Anthony":["SG"],"Facundo Campazzo":["SG"],"Gary Trent Jr.":["SF"],"Jae'Sean Tate":["PF"],"Jalen Suggs":["PG"],"James Wiseman":["PF"],"Josh Hart":["SF"],"Kevin Huerter":["SF"],"Kevin Porter Jr.":["PG"],"Kyle Kuzma":["SF"],"Milos Teodosic":["SG"],"Moses Brown":["PF"],"Terance Mann":["SF"],"Aaron Holiday":["SG"],"Alex Caruso":["SG"],"Cam Reddish":["SG"],"Danuel House Jr.":["SF"],"Davion Mitchell":["PG"],"Dennis Smith Jr.":["SG"],"Desmond Bane":["SG"],"Jaxson Hayes":["PF"],"Jordan Poole":["PG"],"Khem Birch":["PF"],"Malik Monk":["PG"],"Maxi Kleber":["C"],"Mo Bamba":["PF"],"Moritz Wagner":["PF"],"Naz Reid":["PF"],"Nic Claxton":["PF"],"Obi Toppin":["SF"],"Onyeka Okongwu":["PF"],"Oshae Brissett":["SG"],"Payton Pritchard":["PG"],"Royce O'Neale":["PF"],"Shake Milton":["PG"],"Talen Horton-Tucker":["SG"],"Terence Davis":["SF"],"Torrey Craig":["PF"],"Xavier Tillman":["PF"],"Abdel Nader":["PF"],"Allonzo Trier":["PG"],"Amir Coffey":["SG"],"Anfernee Simons":["SG"],"Cedi Osman":["PF"],"Chandler Hutchison":["SF"],"Chuma Okeke":["SF"],"Darius Bazley":["SF"],"De'Anthony Melton":["PG"],"Deni Avdija":["PF"],"Derrick Jones Jr.":["PF"],"Edmond Sumner":["PG"],"Furkan Korkmaz":["SG"],"Glenn Robinson III":["PF"],"Harry Giles III":["C"],"Isaac Okoro":["SG"],"Isaiah Hartenstein":["PF"],"Jaden McDaniels":["SF"],"James Ennis III":["PF"],"Jonathan Kuminga":["PF"],"Jordan McLaughlin":["SG"],"Josh Giddey":["SG"],"Juan Toscano-Anderson":["PF"],"Juancho Hernangomez":["SF"],"Lonnie Walker IV":["SF"],"Matisse Thybulle":["SF"],"Nickeil Alexander-Walker":["PG"],"Nicolo Melli":["SF"],"Patrick Williams":["SF"],"Precious Achiuwa":["C"],"Saben Lee":["PG"],"Taurean Prince":["PF"],"Tony Bradley":["PF"],"Ty Jerome":["SG"],"Zach Collins":["PF"]});
Object.assign(POS_EXTRA,{"Dylan Harper":["SG"],"Jalen McDaniels":["SF"],"Amen Thompson":["SG"],"Stephon Castle":["PG"],"Guerschon Yabusele":["C"],"Dalton Knecht":["SF"],"Isaiah Jackson":["PF"],"Jake LaRavia":["SF"],"Taylor Hendricks":["SF"],"Bruno Fernando":["PF"],"Christian Braun":["SF"],"Brandin Podziemski":["PG"],"Noah Clowney":["C"],"Aleksej Pokusevski":["C"],"Simone Fontecchio":["PF"],"Brandon Miller":["SG"],"Dean Wade":["SF"],"Miles McBride":["SG"],"Jordan Nwora":["PF"],"Gradey Dick":["SF"],"Nick Smith Jr.":["PG"],"Ajay Mitchell":["SG"],"Aaron Wiggins":["SF"],"Julian Champagnie":["PF"],"David Roddy":["SF"],"Cason Wallace":["SG"],"Karlo Matkovic":["C"],"Lamar Stevens":["SF"],"Keita Bates-Diop":["PF"],"Tari Eason":["PF"],"VJ Edgecombe":["PG"],"AJ Lawson":["SF"],"Gui Santos":["PF"],"Jevon Carter":["SG"],"Nassir Little":["PF"],"Jaime Jaquez Jr.":["SG"],"Chimezie Metu":["C"],"Dalano Banton":["SG"],"Cam Whitmore":["SG"],"Drew Eubanks":["PF"],"Ryan Rollins":["SG"],"Tristan da Silva":["PF"],"Josh Okogie":["SF"],"Nikola Jovic":["SF"],"Gabe Vincent":["SG"],"Santi Aldama":["C"],"Reggie Bullock Jr.":["SG"],"Kenyon Martin Jr.":["SF"],"Bol Bol":["PF"],"Jaden Ivey":["SG"],"Ochai Agbaji":["SF"],"Chris Duarte":["SF"],"Alex Sarr":["C"],"Pat Connaughton":["SF"],"Bilal Coulibaly":["SF"],"Kris Murray":["PF"],"Matas Buzelis":["SF"],"Quentin Grimes":["SF"],"Aaron Nesmith":["PF"],"Haywood Highsmith":["PF"],"Toumani Camara":["PF"],"Bub Carrington":["SG"],"Andrew Nembhard":["SG"],"Zaccharie Risacher":["SG"],"Duop Reath":["PF"],"Cody Martin":["PF"],"Grant Williams":["SF"],"Cooper Flagg":["PF"],"Herbert Jones":["SG"],"Peyton Watson":["PF"],"Julian Strawther":["SF"],"Marcus Sasser":["SG"],"Trey Murphy III":["SG"],"Max Strus":["SF"],"Dyson Daniels":["PG"],"Trayce Jackson-Davis":["PF"],"Isaiah Livers":["SF"],"Caleb Martin":["PF"],"Day'Ron Sharpe":["PF"],"Kyle Filipowski":["PF"],"Kon Knueppel":["SF"],"Keyonte George":["SG"],"Mouhamed Gueye":["C"],"Sasha Vezenkov":["SF"],"Devin Carter":["SG"],"Jaden Hardy":["PG"],"Paul Reed":["C"],"Malaki Branham":["PG"],"Naji Marshall":["PF"],"Ron Holland II":["PF"],"Jeremy Sochan":["SF"],"Georges Niang":["SF"],"Devin Vassell":["SF"],"Dalen Terry":["SF"],"Sandro Mamukelashvili":["C"],"Ryan Dunn":["PF"],"Jalen Wilson":["PF"],"Sam Hauser":["PF"],"Josh Primo":["PG"],"Ben Sheppard":["SF"],"Pelle Larsson":["SF"],"Javonte Green":["SG"],"AJ Griffin":["SG"],"Jalen Johnson":["PF"],"Jalen Smith":["C"],"Keegan Murray":["PF"],"Derik Queen":["PF"],"Keon Ellis":["PG"],"Lindy Waters III":["SF"],"Corey Kispert":["SG"],"Jabari Smith Jr.":["SF"],"Jaylen Nowell":["PG"],"Kenrich Williams":["PF"],"Tre Mann":["SG"],"Vince Williams Jr.":["SF"],"Jonathan Mogbo":["C"],"Moses Moody":["SF"],"Kyshawn George":["SG"],"Jordan Goodwin":["SG"],"Max Christie":["SF"],"Mike Muscala":["PF"],"Jarace Walker":["SF"],"Dante Exum":["SG"],"Landry Shamet":["PG"],"Trendon Watford":["SF"],"Bones Hyland":["SG"],"Ausar Thompson":["SF"],"Jared McCain":["SG"],"Jaylen Wells":["SG"],"Josh Green":["SF"],"AJ Johnson":["PG"],"Ayo Dosunmu":["PG"],"Bennedict Mathurin":["SF"],"Jeremiah Robinson-Earl":["C"],"Anthony Black":["SG"]});
const DB=P.map((p,i)=>({id:i,name:p[0],pos:p[1],ovr:p[2],team:p[3],era:"'"+p[4],
  positions:p[5]||[...new Set([p[1],...(POS_EXTRA[p[0]]||[])])],styles:p[6],weight:p[7],acquisitionActive:p[8]!==false,modernEligible:p[9]!==false,tier:tierOf(p[2])}));
/* ============ UNIVERSAL chemistryTags SYSTEM ============ */
/* A. Generational era — every card gets exactly one, derived from its era */
const ERA_TAG={"'50s":"Era_Classic","'60s":"Era_Classic","'70s":"Era_Classic","'80s":"Era_Golden",
"'90s":"Era_Vintage","'00s":"Era_Modern","'10s":"Era_Contemporary","'20s":"Era_Future"};
/* B. Playstyle archetypes — explicit for notables, positional default for the rest (1–2 each) */
const STYLE_TAGS={
"Stephen Curry":["Style_Sharpshooter","Style_FloorGeneral"],"Ray Allen":["Style_Sharpshooter"],
"Reggie Miller":["Style_Sharpshooter"],"Klay Thompson":["Style_Sharpshooter"],"Larry Bird":["Style_Sharpshooter"],
"Dirk Nowitzki":["Style_Sharpshooter","Style_PaintBeast"],"Steve Nash":["Style_FloorGeneral","Style_Sharpshooter"],
"Kevin Durant":["Style_Sharpshooter","Style_FlightClub"],"Damian Lillard":["Style_Sharpshooter","Style_FloorGeneral"],
"Trae Young":["Style_Sharpshooter","Style_FloorGeneral"],"Peja Stojakovic":["Style_Sharpshooter"],
"Glen Rice":["Style_Sharpshooter"],"Chris Mullin":["Style_Sharpshooter"],"Jeff Hornacek":["Style_Sharpshooter"],
"Steve Kerr":["Style_Sharpshooter"],"John Paxson":["Style_Sharpshooter"],"Duncan Robinson":["Style_Sharpshooter"],
"Tyler Herro":["Style_Sharpshooter"],"Devin Booker":["Style_Sharpshooter"],"Carmelo Anthony":["Style_Sharpshooter"],
"Michael Jordan":["Style_FlightClub","Style_Lockdown"],"Vince Carter":["Style_FlightClub"],
"Julius Erving":["Style_FlightClub"],"Dominique Wilkins":["Style_FlightClub"],"Ja Morant":["Style_FlightClub","Style_FloorGeneral"],
"Kobe Bryant":["Style_FlightClub","Style_Lockdown"],"Dwyane Wade":["Style_FlightClub","Style_Lockdown"],
"Tracy McGrady":["Style_FlightClub"],"Clyde Drexler":["Style_FlightClub"],"Anthony Edwards":["Style_FlightClub"],
"Russell Westbrook":["Style_FlightClub","Style_FloorGeneral"],"Zion Williamson":["Style_FlightClub","Style_PaintBeast"],
"Allen Iverson":["Style_FlightClub"],"LeBron James":["Style_FlightClub","Style_FloorGeneral"],
"Grant Hill":["Style_FlightClub","Style_FloorGeneral"],"Shawn Kemp":["Style_FlightClub","Style_PaintBeast"],
"Spud Webb":["Style_FlightClub"],"Nate Robinson":["Style_FlightClub"],"Elgin Baylor":["Style_FlightClub"],
"Gary Payton":["Style_Lockdown","Style_FloorGeneral"],"Kawhi Leonard":["Style_Lockdown"],
"Scottie Pippen":["Style_Lockdown","Style_FlightClub"],"Dennis Rodman":["Style_Lockdown"],
"Rudy Gobert":["Style_Lockdown","Style_PaintBeast"],"Ben Wallace":["Style_Lockdown"],
"Bruce Bowen":["Style_Lockdown"],"Tony Allen":["Style_Lockdown"],"Shane Battier":["Style_Lockdown"],
"Dikembe Mutombo":["Style_Lockdown","Style_PaintBeast"],"Alonzo Mourning":["Style_Lockdown","Style_PaintBeast"],
"Hakeem Olajuwon":["Style_PaintBeast","Style_Lockdown"],"Bill Russell":["Style_Lockdown","Style_PaintBeast"],
"Tim Duncan":["Style_PaintBeast","Style_Lockdown"],"Kevin Garnett":["Style_Lockdown","Style_PaintBeast"],
"David Robinson":["Style_PaintBeast","Style_Lockdown"],"Anthony Davis":["Style_PaintBeast","Style_Lockdown"],
"Dwight Howard":["Style_PaintBeast","Style_Lockdown"],"Draymond Green":["Style_Lockdown","Style_FloorGeneral"],
"Andre Iguodala":["Style_Lockdown"],"Shawn Marion":["Style_Lockdown"],"Andrei Kirilenko":["Style_Lockdown"],
"Marc Gasol":["Style_Lockdown","Style_PaintBeast"],"Victor Wembanyama":["Style_Lockdown","Style_PaintBeast"],
"Magic Johnson":["Style_FloorGeneral"],"John Stockton":["Style_FloorGeneral"],"Chris Paul":["Style_FloorGeneral"],
"Jason Kidd":["Style_FloorGeneral","Style_Lockdown"],"Luka Doncic":["Style_FloorGeneral","Style_Sharpshooter"],
"Oscar Robertson":["Style_FloorGeneral"],"Isiah Thomas":["Style_FloorGeneral"],"Walt Frazier":["Style_FloorGeneral","Style_Lockdown"],
"Jalen Brunson":["Style_FloorGeneral"],"Tyrese Haliburton":["Style_FloorGeneral","Style_Sharpshooter"],
"Nikola Jokic":["Style_FloorGeneral","Style_PaintBeast"],"James Harden":["Style_FloorGeneral","Style_Sharpshooter"],
"Shai Gilgeous-Alexander":["Style_FloorGeneral"],"Kyrie Irving":["Style_FloorGeneral"],
"Shaquille O'Neal":["Style_PaintBeast"],"Wilt Chamberlain":["Style_PaintBeast"],
"Kareem Abdul-Jabbar":["Style_PaintBeast"],"Giannis Antetokounmpo":["Style_PaintBeast","Style_FlightClub"],
"Joel Embiid":["Style_PaintBeast"],"Moses Malone":["Style_PaintBeast"],"Karl Malone":["Style_PaintBeast"],
"Charles Barkley":["Style_PaintBeast"],"Patrick Ewing":["Style_PaintBeast"],"Yao Ming":["Style_PaintBeast"]};
const DEFAULT_STYLE={PG:["Style_FloorGeneral"],SG:["Style_Sharpshooter"],SF:["Style_FlightClub"],
PF:["Style_PaintBeast"],C:["Style_PaintBeast"]};
/* AUDIT OVERRIDES: Style_Slasher (driving-lane finesse) + Style_AnkleBreaker (elite handles),
   plus identity corrections so tags reflect what each player is KNOWN for */
Object.assign(STYLE_TAGS,{
"Dwyane Wade":["Style_Slasher","Style_Lockdown"],"Shai Gilgeous-Alexander":["Style_Slasher","Style_FloorGeneral"],
"Manu Ginobili":["Style_Slasher"],"Jimmy Butler":["Style_Slasher","Style_Lockdown"],
"Tony Parker":["Style_Slasher"],"Derrick Rose":["Style_Slasher"],"George Gervin":["Style_Slasher"],
"Tyrese Maxey":["Style_Slasher","Style_Sharpshooter"],"De'Aaron Fox":["Style_Slasher"],
"Jaylen Brown":["Style_Slasher"],"DeMar DeRozan":["Style_Slasher"],"Franz Wagner":["Style_Slasher"],
"Kevin Johnson":["Style_Slasher","Style_FloorGeneral"],"Jalen Brunson":["Style_Slasher","Style_FloorGeneral"],
"Latrell Sprewell":["Style_Slasher"],
"Kyrie Irving":["Style_AnkleBreaker","Style_Slasher"],"Allen Iverson":["Style_AnkleBreaker","Style_Slasher"],
"Tim Hardaway":["Style_AnkleBreaker","Style_FloorGeneral"],"Jason Williams":["Style_AnkleBreaker"],
"Earl Monroe":["Style_AnkleBreaker"],"Pete Maravich":["Style_AnkleBreaker","Style_FloorGeneral"],
"Bob Cousy":["Style_AnkleBreaker","Style_FloorGeneral"],"Isiah Thomas":["Style_FloorGeneral","Style_AnkleBreaker"],
"LaMelo Ball":["Style_AnkleBreaker","Style_FloorGeneral"],"Gilbert Arenas":["Style_Sharpshooter","Style_AnkleBreaker"],
"Scottie Barnes":["Style_Lockdown"],"Toni Kukoc":["Style_FloorGeneral","Style_Sharpshooter"],
"Horace Grant":["Style_Lockdown"],"Charles Oakley":["Style_Lockdown"],"Kurt Rambis":["Style_Lockdown"],
"Robert Horry":["Style_Sharpshooter"],"Matt Bonner":["Style_Sharpshooter"],
"Rasheed Wallace":["Style_Sharpshooter","Style_PaintBeast"],"Lamar Odom":["Style_FloorGeneral"],
"Aaron Gordon":["Style_FlightClub"],"John Starks":["Style_Lockdown"],"Doug Christie":["Style_Lockdown"],
"Gary Payton II":["Style_Lockdown"],"Danny Green":["Style_Sharpshooter","Style_Lockdown"],
"Brook Lopez":["Style_Sharpshooter","Style_PaintBeast"],"Chet Holmgren":["Style_Lockdown","Style_PaintBeast"],
"Manute Bol":["Style_Lockdown"],"Shawn Bradley":["Style_Lockdown"],
"Vlade Divac":["Style_FloorGeneral","Style_PaintBeast"],"Arvydas Sabonis":["Style_FloorGeneral","Style_PaintBeast"],
"Domantas Sabonis":["Style_FloorGeneral","Style_PaintBeast"],"Michael Porter Jr.":["Style_Sharpshooter"],
"Jayson Tatum":["Style_Sharpshooter"],"Paul George":["Style_Sharpshooter","Style_Lockdown"],
"Klay Thompson":["Style_Sharpshooter","Style_Lockdown"],"Rajon Rondo":["Style_FloorGeneral","Style_Lockdown"],
"Jrue Holiday":["Style_Lockdown","Style_FloorGeneral"],"Mark Price":["Style_Sharpshooter","Style_FloorGeneral"],
"Chauncey Billups":["Style_Sharpshooter","Style_FloorGeneral"]});

/* Phase 1 archetypes — one clean role-player identity; hand-verified star profiles. */
Object.assign(STYLE_TAGS,{"DeMarcus Cousins":["Style_PaintBeast","Style_Sharpshooter"],"Jermaine O'Neal":["Style_PaintBeast","Style_Lockdown"],"Elton Brand":["Style_PaintBeast","Style_Lockdown"],"Isaiah Thomas":["Style_Sharpshooter","Style_AnkleBreaker"],"Brandon Roy":["Style_Slasher","Style_Sharpshooter"],"Gordon Hayward":["Style_Sharpshooter","Style_Slasher"],"Joe Johnson":["Style_Sharpshooter","Style_FloorGeneral"],"Kemba Walker":["Style_AnkleBreaker","Style_Sharpshooter"],"Michael Finley":["Style_Sharpshooter","Style_FlightClub"],"Pascal Siakam":["Style_Slasher","Style_Lockdown"],"Victor Oladipo":["Style_Slasher","Style_Lockdown"],"Antawn Jamison":["Style_PaintBeast"],"Antonio McDyess":["Style_PaintBeast","Style_FlightClub"],"Joakim Noah":["Style_Lockdown","Style_FloorGeneral"],"Paul Millsap":["Style_PaintBeast","Style_Lockdown"],"Stephon Marbury":["Style_AnkleBreaker","Style_FloorGeneral"],"Al Horford":["Style_Lockdown","Style_Sharpshooter"],"Andrew Bynum":["Style_PaintBeast","Style_Lockdown"],"Brandon Ingram":["Style_Sharpshooter","Style_Slasher"],"Carlos Boozer":["Style_PaintBeast"],"Clint Capela":["Style_PaintBeast","Style_Lockdown"],"Julius Randle":["Style_PaintBeast","Style_Slasher"],"Kristaps Porzingis":["Style_Sharpshooter","Style_Lockdown"],"Rashard Lewis":["Style_Sharpshooter"],"Rudy Gay":["Style_Slasher","Style_Sharpshooter"],"Al Jefferson":["Style_PaintBeast"],"Andre Drummond":["Style_PaintBeast"],"Darius Garland":["Style_FloorGeneral","Style_AnkleBreaker"],"Dejounte Murray":["Style_Lockdown"],"Fred VanVleet":["Style_Sharpshooter","Style_Lockdown"],"Goran Dragic":["Style_Slasher"],"Hassan Whiteside":["Style_Lockdown"],"Jerry Stackhouse":["Style_Slasher"],"Marcus Camby":["Style_Lockdown"],"Michael Redd":["Style_Sharpshooter"],"Nikola Vucevic":["Style_PaintBeast","Style_Sharpshooter"],"Robert Williams":["Style_Lockdown"],"Serge Ibaka":["Style_Lockdown"],"Andres Nocioni":["Style_Lockdown"],"Caron Butler":["Style_Slasher"],"Chris Kaman":["Style_PaintBeast"],"D'Angelo Russell":["Style_Sharpshooter"],"Danny Granger":["Style_Sharpshooter"],"David Lee":["Style_PaintBeast"],"Deandre Ayton":["Style_PaintBeast"],"Emeka Okafor":["Style_Lockdown"],"Gerald Wallace":["Style_Lockdown"],"Jamaal Magloire":["Style_PaintBeast"],"Jarrett Allen":["Style_Lockdown"],"Josh Smith":["Style_FlightClub","Style_Lockdown"],"Jusuf Nurkic":["Style_PaintBeast"],"Kevin Martin":["Style_Sharpshooter"],"Kirk Hinrich":["Style_FloorGeneral"],"Luol Deng":["Style_Lockdown"],"Mike James":["Style_Sharpshooter"],"Monta Ellis":["Style_Slasher"],"Myles Turner":["Style_PaintBeast"],"Ricky Davis":["Style_FlightClub"],"Stephen Jackson":["Style_Lockdown"],"Theo Ratliff":["Style_Lockdown"],"Zydrunas Ilgauskas":["Style_PaintBeast"],"Andre Miller":["Style_FloorGeneral"],"Avery Bradley":["Style_Sharpshooter"],"Ben Gordon":["Style_Sharpshooter"],"Brandon Jennings":["Style_FlightClub"],"Caris LeVert":["Style_FlightClub"],"Christian Wood":["Style_PaintBeast"],"Corey Maggette":["Style_Slasher"],"Danilo Gallinari":["Style_FlightClub"],"Devin Harris":["Style_Slasher"],"Eric Bledsoe":["Style_Lockdown"],"Erick Dampier":["Style_PaintBeast"],"Jamal Crawford":["Style_Sharpshooter"],"Jaren Jackson Jr.":["Style_PaintBeast"],"Joe Smith":["Style_PaintBeast"],"Jonas Valanciunas":["Style_PaintBeast"],"Malcolm Brogdon":["Style_Sharpshooter"],"Mehmet Okur":["Style_Sharpshooter"],"Mike Dunleavy Jr.":["Style_Sharpshooter"],"RJ Barrett":["Style_FlightClub"],"Spencer Dinwiddie":["Style_FloorGeneral"],"Tayshaun Prince":["Style_Lockdown"],"Tobias Harris":["Style_Sharpshooter"],"Troy Murphy":["Style_Sharpshooter"],"Al Harrington":["Style_Sharpshooter"],"Andrew Bogut":["Style_PaintBeast"],"Brad Miller":["Style_FloorGeneral"],"Collin Sexton":["Style_FloorGeneral"],"Eric Gordon":["Style_Sharpshooter"],"Evan Turner":["Style_FloorGeneral"],"George Hill":["Style_FloorGeneral"],"Iman Shumpert":["Style_Lockdown"],"Jerami Grant":["Style_FlightClub"],"Jim Jackson":["Style_Sharpshooter"],"John Collins":["Style_FlightClub"],"Jonathan Isaac":["Style_PaintBeast"],"Jose Calderon":["Style_FloorGeneral"],"Juwan Howard":["Style_PaintBeast"],"Larry Hughes":["Style_Lockdown"],"Lonzo Ball":["Style_FloorGeneral"],"Matt Harpring":["Style_Lockdown"],"Michael Beasley":["Style_Sharpshooter"],"Mikal Bridges":["Style_FlightClub"],"Mike Miller":["Style_Sharpshooter"],"Montrezl Harrell":["Style_PaintBeast"],"Steven Adams":["Style_PaintBeast"],"Terry Rozier":["Style_FloorGeneral"],"Ty Lawson":["Style_FloorGeneral"],"Tyreke Evans":["Style_FlightClub"],"Andris Biedrins":["Style_PaintBeast"],"Bojan Bogdanovic":["Style_FlightClub"],"Buddy Hield":["Style_Sharpshooter"],"Gary Harris":["Style_Sharpshooter"],"Greg Monroe":["Style_PaintBeast"],"Harrison Barnes":["Style_PaintBeast"],"Jabari Parker":["Style_PaintBeast"],"James Posey":["Style_Lockdown"],"Kelly Oubre Jr.":["Style_FlightClub"],"Kenneth Faried":["Style_PaintBeast"],"Kyle Korver":["Style_Sharpshooter"],"Lance Stephenson":["Style_Slasher"],"Leandro Barbosa":["Style_Slasher"],"Marcin Gortat":["Style_PaintBeast"],"Marvin Bagley III":["Style_PaintBeast"],"Mitchell Robinson":["Style_PaintBeast"],"Nikola Pekovic":["Style_PaintBeast"],"Primoz Brezec":["Style_PaintBeast"],"Quentin Richardson":["Style_Sharpshooter"],"Samuel Dalembert":["Style_Lockdown"],"Tyson Chandler":["Style_Lockdown"],"Aaron Brooks":["Style_FlightClub"],"Anthony Parker":["Style_Lockdown"],"Antonio Daniels":["Style_FloorGeneral"],"Austin Rivers":["Style_Sharpshooter"],"Bogdan Bogdanovic":["Style_Sharpshooter"],"Brandon Clarke":["Style_PaintBeast"],"Brendan Haywood":["Style_Lockdown"],"Darren Collison":["Style_FloorGeneral"],"De'Andre Hunter":["Style_FlightClub"],"Delonte West":["Style_FloorGeneral"],"Dennis Schroder":["Style_FloorGeneral"],"Derrick Favors":["Style_PaintBeast"],"Dion Waiters":["Style_Sharpshooter"],"Evan Fournier":["Style_Sharpshooter"],"Grayson Allen":["Style_Sharpshooter"],"Greg Oden":["Style_PaintBeast"],"Jae Crowder":["Style_FlightClub"],"Jamaal Tinsley":["Style_FloorGeneral"],"Joe Ingles":["Style_FlightClub"],"Josh Childress":["Style_Lockdown"],"Josh Richardson":["Style_Sharpshooter"],"Keldon Johnson":["Style_FlightClub"],"Lauri Markkanen":["Style_PaintBeast"],"Malik Beasley":["Style_Sharpshooter"],"Marcus Smart":["Style_Sharpshooter"],"Markelle Fultz":["Style_FloorGeneral"],"Michael Carter-Williams":["Style_FloorGeneral"],"Morris Peterson":["Style_Lockdown"],"Norman Powell":["Style_Sharpshooter"],"Otto Porter Jr.":["Style_PaintBeast"],"Raja Bell":["Style_Lockdown"],"Randy Foye":["Style_Sharpshooter"],"Raymond Felton":["Style_FloorGeneral"],"Reggie Jackson":["Style_FloorGeneral"],"Rodney Stuckey":["Style_FlightClub"],"Taj Gibson":["Style_Lockdown"],"Tim Hardaway Jr.":["Style_Sharpshooter"],"Tim Thomas":["Style_Sharpshooter"],"Wendell Carter Jr.":["Style_PaintBeast"],"Wilson Chandler":["Style_FlightClub"],"Andrea Bargnani":["Style_Sharpshooter"],"Arron Afflalo":["Style_Lockdown"],"Bobby Portis":["Style_PaintBeast"],"Brandon Knight":["Style_FloorGeneral"],"Chandler Parsons":["Style_Sharpshooter"],"Channing Frye":["Style_Sharpshooter"],"Charlie Villanueva":["Style_Sharpshooter"],"Chris Boucher":["Style_PaintBeast"],"Daniel Theis":["Style_PaintBeast"],"Davis Bertans":["Style_PaintBeast"],"Derrick White":["Style_FloorGeneral"],"Devonte' Graham":["Style_FloorGeneral"],"Donte DiVincenzo":["Style_Sharpshooter"],"Drew Gooden":["Style_PaintBeast"],"Earl Watson":["Style_FloorGeneral"],"Eddy Curry":["Style_PaintBeast"],"Eric Paschall":["Style_PaintBeast"],"Jalen Green":["Style_FloorGeneral"],"Jameer Nelson":["Style_FloorGeneral"],"James Johnson":["Style_PaintBeast"],"Jarred Vanderbilt":["Style_PaintBeast"],"Jarrett Jack":["Style_FloorGeneral"],"Jeff Green":["Style_Lockdown"],"Jeff Teague":["Style_FloorGeneral"],"JJ Redick":["Style_Sharpshooter"],"Joe Harris":["Style_Sharpshooter"],"Joel Przybilla":["Style_PaintBeast"],"Jordan Clarkson":["Style_Sharpshooter"],"Kenny Thomas":["Style_PaintBeast"],"Kentavious Caldwell-Pope":["Style_Sharpshooter"],"Kurt Thomas":["Style_PaintBeast"],"Kyle Anderson":["Style_Sharpshooter"],"Larry Nance Jr.":["Style_PaintBeast"],"Larry Sanders":["Style_Lockdown"],"Lindsey Hunter":["Style_Lockdown"],"Luis Scola":["Style_PaintBeast"],"Marcus Banks":["Style_FloorGeneral"],"Mark Blount":["Style_Sharpshooter"],"Marvin Williams":["Style_Lockdown"],"Mason Plumlee":["Style_PaintBeast"],"Nicolas Batum":["Style_Sharpshooter"],"OG Anunoby":["Style_FlightClub"],"Patrick Beverley":["Style_Sharpshooter"],"Rafer Alston":["Style_FloorGeneral"],"Richaun Holmes":["Style_PaintBeast"],"Ricky Rubio":["Style_FloorGeneral"],"Robert Covington":["Style_FlightClub"],"Rui Hachimura":["Style_PaintBeast"],"Thaddeus Young":["Style_PaintBeast"],"Thomas Bryant":["Style_PaintBeast"],"Trenton Hassell":["Style_Lockdown"],"Trevor Ariza":["Style_Lockdown"],"Tristan Thompson":["Style_PaintBeast"],"Will Barton":["Style_Sharpshooter"],"Aron Baynes":["Style_PaintBeast"],"Bobby Simmons":["Style_Lockdown"],"Carlos Delfino":["Style_Lockdown"],"Chucky Atkins":["Style_FloorGeneral"],"Coby White":["Style_FloorGeneral"],"Cody Zeller":["Style_PaintBeast"],"Daniel Gafford":["Style_PaintBeast"],"Dario Saric":["Style_PaintBeast"],"Dillon Brooks":["Style_FlightClub"],"Duncan Robinson":["Style_FlightClub"],"Gerald Green":["Style_FlightClub"],"Gerald Henderson":["Style_FlightClub"],"Immanuel Quickley":["Style_FloorGeneral"],"Isaiah Stewart":["Style_PaintBeast"],"Ivica Zubac":["Style_PaintBeast"],"Jamario Moon":["Style_FlightClub"],"Jared Sullinger":["Style_PaintBeast"],"Jason Kapono":["Style_Sharpshooter"],"JaVale McGee":["Style_PaintBeast"],"Jeremy Lamb":["Style_Sharpshooter"],"Josh Jackson":["Style_FlightClub"],"Kelly Olynyk":["Style_PaintBeast"],"Kendrick Nunn":["Style_FloorGeneral"],"Luguentz Dort":["Style_Sharpshooter"],"Luke Kennard":["Style_Sharpshooter"],"Luke Ridnour":["Style_FloorGeneral"],"Marcus Morris Sr.":["Style_PaintBeast"],"Markieff Morris":["Style_PaintBeast"],"Marko Jaric":["Style_FloorGeneral"],"Marquis Daniels":["Style_FlightClub"],"Miles Bridges":["Style_PaintBeast"],"Miles Plumlee":["Style_PaintBeast"],"Monte Morris":["Style_FloorGeneral"],"Nemanja Bjelica":["Style_PaintBeast"],"Nerlens Noel":["Style_PaintBeast"],"Nick Young":["Style_Sharpshooter"],"PJ Washington":["Style_PaintBeast"],"Rodney Hood":["Style_Sharpshooter"],"Ryan Anderson":["Style_PaintBeast"],"Saddiq Bey":["Style_FlightClub"],"Sebastian Telfair":["Style_FloorGeneral"],"Seth Curry":["Style_FloorGeneral"],"T.J. McConnell":["Style_FloorGeneral"],"Terrence Ross":["Style_FlightClub"],"Troy Brown Jr.":["Style_FlightClub"],"Vladimir Radmanovic":["Style_Sharpshooter"],"Wesley Matthews":["Style_Lockdown"],"Al Thornton":["Style_FlightClub"],"Alec Burks":["Style_Sharpshooter"],"Amir Johnson":["Style_PaintBeast"],"Anderson Varejao":["Style_PaintBeast"],"Anthony Johnson":["Style_FloorGeneral"],"Bruce Brown":["Style_Sharpshooter"],"Cameron Johnson":["Style_FlightClub"],"Chris Duhon":["Style_FloorGeneral"],"Cole Anthony":["Style_FloorGeneral"],"Daniel Gibson":["Style_Sharpshooter"],"Dewayne Dedmon":["Style_PaintBeast"],"Elfrid Payton":["Style_FloorGeneral"],"Etan Thomas":["Style_PaintBeast"],"Fabricio Oberto":["Style_PaintBeast"],"Facundo Campazzo":["Style_FloorGeneral"],"Gary Trent Jr.":["Style_Sharpshooter"],"Hakim Warrick":["Style_FlightClub"],"Jae'Sean Tate":["Style_FlightClub"],"Jakob Poeltl":["Style_PaintBeast"],"Jalen Suggs":["Style_Sharpshooter"],"James Wiseman":["Style_PaintBeast"],"Jarron Collins":["Style_PaintBeast"],"Jason Maxiell":["Style_PaintBeast"],"Josh Hart":["Style_Sharpshooter"],"Justise Winslow":["Style_FlightClub"],"Kevin Huerter":["Style_Sharpshooter"],"Kevin Porter Jr.":["Style_Sharpshooter"],"Kyle Kuzma":["Style_PaintBeast"],"Martell Webster":["Style_Sharpshooter"],"Michael Kidd-Gilchrist":["Style_FlightClub"],"Milos Teodosic":["Style_FloorGeneral"],"Moses Brown":["Style_PaintBeast"],"Nenad Krstic":["Style_PaintBeast"],"Robin Lopez":["Style_PaintBeast"],"Ryan Gomes":["Style_Sharpshooter"],"Shannon Brown":["Style_FlightClub"],"Terance Mann":["Style_Sharpshooter"],"Terrence Jones":["Style_PaintBeast"],"Tiago Splitter":["Style_PaintBeast"],"Tyler Johnson":["Style_FloorGeneral"],"Tyrus Thomas":["Style_Lockdown"],"Willie Cauley-Stein":["Style_PaintBeast"],"Willy Hernangomez":["Style_PaintBeast"],"Aaron Holiday":["Style_FloorGeneral"],"Alex Caruso":["Style_FloorGeneral"],"Alex Len":["Style_PaintBeast"],"Andre Roberson":["Style_FlightClub"],"Anthony Bennett":["Style_PaintBeast"],"Bismack Biyombo":["Style_PaintBeast"],"Brian Skinner":["Style_Lockdown"],"Cam Reddish":["Style_FlightClub"],"Cameron Payne":["Style_FloorGeneral"],"Carl Landry":["Style_PaintBeast"],"Charlie Bell":["Style_Lockdown"],"Chris Wilcox":["Style_FlightClub"],"Courtney Lee":["Style_Lockdown"],"Danuel House Jr.":["Style_Sharpshooter"],"Darko Milicic":["Style_Lockdown"],"David Nwaba":["Style_Sharpshooter"],"Davion Mitchell":["Style_Sharpshooter"],"Delon Wright":["Style_FloorGeneral"],"Dennis Smith Jr.":["Style_FloorGeneral"],"Denzel Valentine":["Style_Sharpshooter"],"DeShawn Stevenson":["Style_Lockdown"],"Desmond Bane":["Style_FloorGeneral"],"Dorian Finney-Smith":["Style_PaintBeast"],"Doug McDermott":["Style_FlightClub"],"Dwight Powell":["Style_PaintBeast"],"Eddie House":["Style_Sharpshooter"],"Ersan Ilyasova":["Style_PaintBeast"],"Frank Kaminsky III":["Style_PaintBeast"],"Gorgui Dieng":["Style_PaintBeast"],"Greivis Vasquez":["Style_FloorGeneral"],"Jahlil Okafor":["Style_PaintBeast"],"JaMychal Green":["Style_PaintBeast"],"Jaxson Hayes":["Style_PaintBeast"],"Jeff Foster":["Style_PaintBeast"],"John Salmons":["Style_Lockdown"],"Jordan Crawford":["Style_Sharpshooter"],"Jordan Hill":["Style_PaintBeast"],"Jordan Poole":["Style_Sharpshooter"],"Khem Birch":["Style_PaintBeast"],"KJ Martin":["Style_FlightClub"],"Kris Dunn":["Style_FloorGeneral"],"Kwame Brown":["Style_PaintBeast"],"Leon Powe":["Style_PaintBeast"],"Linas Kleiza":["Style_Sharpshooter"],"Luc Richard Mbah a Moute":["Style_FlightClub"],"Luke Walton":["Style_FloorGeneral"],"Malik Monk":["Style_Sharpshooter"],"Marcus Thornton":["Style_Sharpshooter"],"Marquese Chriss":["Style_PaintBeast"],"Matt Barnes":["Style_Lockdown"],"Maxi Kleber":["Style_PaintBeast"],"Melvin Ely":["Style_PaintBeast"],"Mo Bamba":["Style_PaintBeast"],"Moritz Wagner":["Style_PaintBeast"],"Naz Reid":["Style_PaintBeast"],"Nic Claxton":["Style_PaintBeast"],"Nikola Mirotic":["Style_PaintBeast"],"Obi Toppin":["Style_PaintBeast"],"Omer Asik":["Style_PaintBeast"],"Onyeka Okongwu":["Style_PaintBeast"],"Oshae Brissett":["Style_FlightClub"],"P.J. Tucker":["Style_FlightClub"],"Payton Pritchard":["Style_Sharpshooter"],"Ramon Sessions":["Style_FloorGeneral"],"Rasual Butler":["Style_Sharpshooter"],"Rondae Hollis-Jefferson":["Style_FlightClub"],"Royce O'Neale":["Style_FlightClub"],"Sean Williams":["Style_Lockdown"],"Shabazz Napier":["Style_FloorGeneral"],"Shake Milton":["Style_Sharpshooter"],"Skal Labissiere":["Style_PaintBeast"],"Spencer Hawes":["Style_Sharpshooter"],"Talen Horton-Tucker":["Style_FloorGeneral"],"Terence Davis":["Style_Sharpshooter"],"Terrence Williams":["Style_FlightClub"],"Tomas Satoransky":["Style_Sharpshooter"],"Tony Battie":["Style_PaintBeast"],"Torrey Craig":["Style_FlightClub"],"Treveon Graham":["Style_Sharpshooter"],"Trevor Booker":["Style_PaintBeast"],"Trey Burke":["Style_FloorGeneral"],"Tyus Jones":["Style_FloorGeneral"],"Xavier Tillman":["Style_FlightClub"],"Zaza Pachulia":["Style_PaintBeast"],"Abdel Nader":["Style_FlightClub"],"Al-Farouq Aminu":["Style_FlightClub"],"Alan Williams":["Style_PaintBeast"],"Allen Crabbe":["Style_Sharpshooter"],"Allonzo Trier":["Style_Sharpshooter"],"Amir Coffey":["Style_FlightClub"],"Anfernee Simons":["Style_FloorGeneral"],"Anthony Carter":["Style_FloorGeneral"],"Avery Johnson":["Style_FloorGeneral"],"Beno Udrih":["Style_FloorGeneral"],"Boban Marjanovic":["Style_PaintBeast"],"Brandan Wright":["Style_FlightClub"],"Brandon Bass":["Style_PaintBeast"],"Brandon Williams":["Style_FlightClub"],"Bryn Forbes":["Style_Sharpshooter"],"Carlos Arroyo":["Style_FloorGeneral"],"Cedi Osman":["Style_FlightClub"],"Chandler Hutchison":["Style_Sharpshooter"],"Chris Andersen":["Style_PaintBeast"],"Chuma Okeke":["Style_PaintBeast"],"Corey Brewer":["Style_Lockdown"],"Cory Joseph":["Style_Sharpshooter"],"Darius Bazley":["Style_PaintBeast"],"De'Anthony Melton":["Style_Sharpshooter"],"Dee Brown":["Style_FlightClub"],"DeMarre Carroll":["Style_FlightClub"],"Deni Avdija":["Style_FlightClub"],"Derrick Jones Jr.":["Style_FlightClub"],"DeSagana Diop":["Style_Lockdown"],"Devin Brown":["Style_Lockdown"],"Earl Boykins":["Style_FloorGeneral"],"Edmond Sumner":["Style_Sharpshooter"],"Francisco Elson":["Style_PaintBeast"],"Francisco Garcia":["Style_Lockdown"],"Furkan Korkmaz":["Style_FlightClub"],"Gary Neal":["Style_Sharpshooter"],"Glen Davis":["Style_PaintBeast"],"Glenn Robinson III":["Style_FlightClub"],"Harry Giles III":["Style_PaintBeast"],"Ian Mahinmi":["Style_PaintBeast"],"Isaac Okoro":["Style_FlightClub"],"Isaiah Hartenstein":["Style_PaintBeast"],"Jaden McDaniels":["Style_PaintBeast"],"James Ennis III":["Style_FlightClub"],"James Jones":["Style_Sharpshooter"],"Jared Dudley":["Style_Sharpshooter"],"Jason Thompson":["Style_PaintBeast"],"Jodie Meeks":["Style_Sharpshooter"],"John Henson":["Style_PaintBeast"],"Jon Leuer":["Style_PaintBeast"],"Jonathan Kuminga":["Style_FlightClub"],"Jonathon Simmons":["Style_Sharpshooter"],"Jordan McLaughlin":["Style_FloorGeneral"],"Josh Giddey":["Style_FloorGeneral"],"Juan Toscano-Anderson":["Style_FlightClub"],"Juancho Hernangomez":["Style_PaintBeast"],"Justin Holiday":["Style_Sharpshooter"],"Kris Humphries":["Style_PaintBeast"],"Langston Galloway":["Style_FloorGeneral"],"Lonnie Walker IV":["Style_Sharpshooter"],"Marco Belinelli":["Style_Sharpshooter"],"Mario Chalmers":["Style_Lockdown"],"Matisse Thybulle":["Style_Sharpshooter"],"Maurice Evans":["Style_FlightClub"],"Meyers Leonard":["Style_PaintBeast"],"Nate Wolters":["Style_FloorGeneral"],"Nazr Mohammed":["Style_PaintBeast"],"Nick Collison":["Style_PaintBeast"],"Nickeil Alexander-Walker":["Style_Sharpshooter"],"Nicolo Melli":["Style_PaintBeast"],"Norris Cole":["Style_FloorGeneral"],"Patrick Patterson":["Style_PaintBeast"],"Patrick Williams":["Style_PaintBeast"],"Precious Achiuwa":["Style_PaintBeast"],"Quinton Ross":["Style_Lockdown"],"Raul Neto":["Style_FloorGeneral"],"Saben Lee":["Style_Sharpshooter"],"Shabazz Muhammad":["Style_FlightClub"],"Speedy Claxton":["Style_FloorGeneral"],"Taurean Prince":["Style_FlightClub"],"Thabo Sefolosha":["Style_FlightClub"],"Thomas Robinson":["Style_PaintBeast"],"Thon Maker":["Style_PaintBeast"],"Tony Bradley":["Style_PaintBeast"],"Tony Snell":["Style_Sharpshooter"],"Travis Outlaw":["Style_FlightClub"],"Trey Lyles":["Style_PaintBeast"],"Ty Jerome":["Style_FloorGeneral"],"Tyler Ulis":["Style_FloorGeneral"],"Wayne Ellington":["Style_Sharpshooter"],"Zach Collins":["Style_PaintBeast"],"Metta World Peace":["Style_Lockdown"]});
/* C+D. Historical synergies & rivalries — strict member lists */
const STORY_TAGS={
  "Story_DreamTeam": [
    "Michael Jordan",
    "Magic Johnson",
    "Larry Bird",
    "Charles Barkley",
    "Scottie Pippen",
    "Patrick Ewing",
    "John Stockton",
    "Karl Malone",
    "Clyde Drexler",
    "Chris Mullin",
    "David Robinson",
    "Christian Laettner"
  ],
  "Story_RedeemTeam": [
    "Kobe Bryant",
    "LeBron James",
    "Dwyane Wade",
    "Carmelo Anthony",
    "Chris Paul",
    "Chris Bosh",
    "Jason Kidd",
    "Dwight Howard",
    "Deron Williams"
  ],
  "Story_Draft_1984": [
    "Michael Jordan",
    "Hakeem Olajuwon",
    "Charles Barkley",
    "John Stockton",
    "Otis Thorpe",
    "Kevin Willis"
  ],
  "Story_Draft_1996": [
    "Kobe Bryant",
    "Allen Iverson",
    "Steve Nash",
    "Ray Allen",
    "Shareef Abdur-Rahim",
    "Stephon Marbury"
  ],
  "Story_Draft_2003": [
    "LeBron James",
    "Dwyane Wade",
    "Carmelo Anthony",
    "Chris Bosh",
    "David West"
  ],
  "Story_Draft_2009": [
    "Stephen Curry",
    "James Harden",
    "DeMar DeRozan",
    "Jrue Holiday"
  ],
  "Story_Draft_2018": [
    "Luka Doncic",
    "Shai Gilgeous-Alexander",
    "Jalen Brunson",
    "Trae Young",
    "Jaren Jackson Jr."
  ],
  "Story_Rival_80s_Classic": [
    "Magic Johnson",
    "Larry Bird"
  ],
  "Story_Rival_BadBoys": [
    "Michael Jordan",
    "Isiah Thomas",
    "Dennis Rodman",
    "Bill Laimbeer",
    "Mark Aguirre"
  ],
  "Story_Rival_TexasTriad": [
    "Tim Duncan",
    "Dirk Nowitzki"
  ],
  "Story_Rival_ModernFinals": [
    "LeBron James",
    "Stephen Curry",
    "Kevin Durant"
  ]
};
const STORIES_BY_NAME={};
Object.entries(STORY_TAGS).forEach(([tag,names])=>names.forEach(n=>{(STORIES_BY_NAME[n]=STORIES_BY_NAME[n]||[]).push(tag);}));
/* display names */
const TAG_LABEL={Era_Classic:"Classic Era",Era_Golden:"Golden Era",Era_Vintage:"Vintage '90s",
Era_Modern:"2000s Era",Era_Contemporary:"2010s Era",Era_Future:"New School",
Style_Sharpshooter:"Sharpshooters",Style_FlightClub:"Flight Club",Style_Lockdown:"Lockdown",
Style_FloorGeneral:"Floor Generals",Style_PaintBeast:"Paint Beasts",
Style_Slasher:"Slashers",Style_AnkleBreaker:"Ankle Breakers",
Story_DreamTeam:"Dream Team '92",Story_RedeemTeam:"Redeem Team '08",Story_Draft_1984:"'84 Draft Class",
Story_Draft_1996:"'96 Draft Class",Story_Draft_2003:"'03 Draft Class",Story_Draft_2009:"'09 Draft Class",
Story_Draft_2018:"'18 Draft Class",Story_Rival_80s_Classic:"Magic vs Bird",Story_Rival_BadBoys:"Bad Boys Wars",
Story_Rival_TexasTriad:"Texas Triad",Story_Rival_ModernFinals:"Finals Trilogy"};
/* stamp every card: exactly 1 era + 1-2 styles + any story tags */
DB.forEach(p=>{p.tags=[ERA_TAG[p.era],...(p.styles||STYLE_TAGS[p.name]||DEFAULT_STYLE[p.pos]),...(STORIES_BY_NAME[p.name]||[])];});
const ACTIVE_CARDS=DB.filter(p=>p.acquisitionActive);
const POOLS={};TIER_ORDER.forEach(t=>POOLS[t]=ACTIVE_CARDS.filter(p=>p.tier===t));
let ROSTER_POOL="modern";
function rosterPoolCards(t,pool=ROSTER_POOL){return POOLS[t].filter(p=>pool==="history"||p.modernEligible);}
function packRosterPool(){return typeof S!=="undefined"&&S.classic?.cardPool||ROSTER_POOL;}
/* ---- Eras Mode: optional era-lock shared by Classic Draft + daily Decade Lock ---- */
let DRAFT_ERA=null; /* null = all eras; else e.g. "'10s" restricts every draft pool */
function viableEras(){ /* eras deep enough to fill a full draft */
  const by={};DB.forEach(p=>{(by[p.era]=by[p.era]||[]).push(p);});
  return Object.entries(by).filter(([e,a])=>a.length>=120&&STARTER_SLOTS.every(s=>a.some(p=>p.positions.includes(s))))
    .sort((a,b)=>{const ord=["'20s","'10s","'00s","'90s","'80s","'70s","'60s","'50s"];return ord.indexOf(a[0])-ord.indexOf(b[0]);})
    .map(([e])=>e);
}
function eraLabel(e){return e?e.replace("'","20").replace(/^20(\d)0s$/,(m,d)=>d>=5?"19"+d+"0s":"20"+d+"0s"):"All-Time";}
function eraPool(t){return DRAFT_ERA?POOLS[t].filter(p=>p.era===DRAFT_ERA):rosterPoolCards(t,typeof D!=="undefined"&&D.cardPool||ROSTER_POOL);}
function eraPlayerCount(e){return DB.filter(p=>p.era===e).length;}
const POOL_90=ACTIVE_CARDS.filter(p=>p.ovr>=90);

/* ================= PACKS ================= */
const PACKS={
  standard:{name:"Standard Pack",cls:"p-std",guarTier:null,guarLabel:"No guarantee — pure gamble",
    odds:{Bronze:.62,Silver:.30,Gold:.07,Elite:.009,Icon:.001}},
  premium:{name:"Premium Pack",cls:"p-prem",guarTier:"Gold",guarLabel:"Guaranteed at least 1 Gold or better",
    odds:{Bronze:.10,Silver:.40,Gold:.38,Elite:.10,Icon:.02}},
  icon:{name:"Icon Pack",cls:"p-icon",guarTier:"Elite",guarLabel:"Guaranteed at least 1 Elite or better",
    odds:{Gold:.45,Elite:.43,Icon:.12}},
  rare:{name:"Rare-Pull Pack",cls:"p-icon",guarTier:null,guarLabel:"Every card is rated 90+",
    odds:{Gold:.40,Elite:.45,Icon:.15}} // Gold here = 90–91 only
};
function tierRank(t){return TIER_ORDER.indexOf(t);}
function rollTier(odds,rng){let r=(rng||Math.random)(),acc=0;
  for(const t of TIER_ORDER){if(!odds[t])continue;acc+=odds[t];if(r<acc)return t;}
  // float slack: return best offered tier
  for(let i=TIER_ORDER.length-1;i>=0;i--)if(odds[TIER_ORDER[i]])return TIER_ORDER[i];
}
function pickFrom(arr,rng){return arr[Math.floor((rng||Math.random)()*arr.length)];}
function packUniverse(packKey){return packKey==="rare"?POOL_90:ACTIVE_CARDS;}
/* Fisher-Yates shuffle: every pack draws from a freshly randomized copy of the tier pool */
function fisherYates(arr,rng){
  const a=arr.slice(),R=rng||Math.random;
  for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

/* OPTION B SPOTLIGHT
   Visibility tilt only: all cards stay collectible and remain in the same tier/deck cycle.
   Existing v30 cards default to 1.0; additions range from 0.25 to 1.0. */
const SPOTLIGHT={"DeMarcus Cousins":1.0,"Jermaine O'Neal":1.0,"Elton Brand":1.0,"Isaiah Thomas":1.0,"Brandon Roy":1.0,"Gordon Hayward":1.0,"Joe Johnson":1.0,"Kemba Walker":1.0,"Michael Finley":1.0,"Pascal Siakam":1.0,"Victor Oladipo":1.0,"Antawn Jamison":1.0,"Antonio McDyess":1.0,"Joakim Noah":1.0,"Paul Millsap":1.0,"Stephon Marbury":1.0,"Al Horford":1.0,"Andrew Bynum":1.0,"Brandon Ingram":1.0,"Carlos Boozer":1.0,"Clint Capela":1.0,"Julius Randle":1.0,"Kristaps Porzingis":1.0,"Rashard Lewis":1.0,"Rudy Gay":1.0,"Al Jefferson":0.95,"Andre Drummond":1.0,"Darius Garland":1.0,"Dejounte Murray":1.0,"Fred VanVleet":1.0,"Goran Dragic":1.0,"Hassan Whiteside":1.0,"Jerry Stackhouse":0.95,"Marcus Camby":0.95,"Michael Redd":0.95,"Nikola Vucevic":1.0,"Robert Williams":1.0,"Serge Ibaka":1.0,"Andres Nocioni":0.7,"Caron Butler":0.9,"Chris Kaman":0.7,"D'Angelo Russell":1.0,"Danny Granger":0.85,"David Lee":0.85,"Deandre Ayton":1.0,"Emeka Okafor":0.7,"Gerald Wallace":0.85,"Jamaal Magloire":0.7,"Jarrett Allen":1.0,"Josh Smith":1.0,"Jusuf Nurkic":1.0,"Kevin Martin":0.9,"Kirk Hinrich":0.7,"Luol Deng":0.9,"Mike James":0.7,"Monta Ellis":1.0,"Myles Turner":0.85,"Ricky Davis":0.7,"Stephen Jackson":0.85,"Theo Ratliff":0.7,"Zydrunas Ilgauskas":0.7,"Andre Miller":0.85,"Avery Bradley":0.8,"Ben Gordon":0.65,"Brandon Jennings":0.8,"Caris LeVert":0.95,"Christian Wood":0.95,"Corey Maggette":0.85,"Danilo Gallinari":0.95,"Devin Harris":1.0,"Eric Bledsoe":1.0,"Erick Dampier":0.65,"Jamal Crawford":0.65,"Jaren Jackson Jr.":0.95,"Joe Smith":0.65,"Jonas Valanciunas":0.95,"Malcolm Brogdon":0.95,"Mehmet Okur":0.65,"Mike Dunleavy Jr.":0.65,"RJ Barrett":0.95,"Spencer Dinwiddie":0.95,"Tayshaun Prince":0.65,"Tobias Harris":1.0,"Troy Murphy":0.65,"Al Harrington":0.6,"Andrew Bogut":0.75,"Brad Miller":0.8,"Collin Sexton":0.9,"Eric Gordon":0.95,"Evan Turner":0.75,"George Hill":0.75,"Iman Shumpert":0.75,"Jerami Grant":0.9,"Jim Jackson":0.6,"John Collins":1.0,"Jonathan Isaac":0.9,"Jose Calderon":0.8,"Juwan Howard":0.8,"Larry Hughes":0.8,"Lonzo Ball":0.9,"Matt Harpring":0.6,"Michael Beasley":0.6,"Mikal Bridges":0.9,"Mike Miller":0.6,"Montrezl Harrell":0.9,"Steven Adams":0.9,"Terry Rozier":0.9,"Ty Lawson":0.95,"Tyreke Evans":0.75,"Andris Biedrins":0.55,"Bojan Bogdanovic":0.85,"Buddy Hield":0.85,"Gary Harris":0.7,"Greg Monroe":0.7,"Harrison Barnes":0.7,"Jabari Parker":0.7,"James Posey":0.55,"Kelly Oubre Jr.":0.85,"Kenneth Faried":0.7,"Kyle Korver":0.55,"Lance Stephenson":0.9,"Leandro Barbosa":0.75,"Marcin Gortat":0.7,"Marvin Bagley III":0.85,"Mitchell Robinson":0.85,"Nikola Pekovic":0.7,"Primoz Brezec":0.55,"Quentin Richardson":0.55,"Samuel Dalembert":0.55,"Tyson Chandler":0.55,"Aaron Brooks":0.65,"Anthony Parker":0.5,"Antonio Daniels":0.5,"Austin Rivers":0.65,"Bogdan Bogdanovic":0.8,"Brandon Clarke":0.8,"Brendan Haywood":0.5,"Darren Collison":0.65,"De'Andre Hunter":0.8,"Delonte West":0.5,"Dennis Schroder":0.8,"Derrick Favors":0.85,"Dion Waiters":0.65,"Evan Fournier":0.8,"Grayson Allen":0.65,"Greg Oden":0.5,"Jae Crowder":0.65,"Jamaal Tinsley":0.5,"Joe Ingles":0.8,"Josh Childress":0.5,"Josh Richardson":0.8,"Keldon Johnson":0.8,"Lauri Markkanen":0.8,"Malik Beasley":0.8,"Marcus Smart":0.8,"Markelle Fultz":0.65,"Michael Carter-Williams":0.65,"Morris Peterson":0.5,"Norman Powell":0.8,"Otto Porter Jr.":0.65,"Raja Bell":0.5,"Randy Foye":0.5,"Raymond Felton":0.5,"Reggie Jackson":0.8,"Rodney Stuckey":0.65,"Taj Gibson":0.65,"Tim Hardaway Jr.":0.65,"Tim Thomas":0.5,"Wendell Carter Jr.":0.8,"Wilson Chandler":0.65,"Andrea Bargnani":0.45,"Arron Afflalo":0.6,"Bobby Portis":0.75,"Brandon Knight":0.6,"Chandler Parsons":0.6,"Channing Frye":0.45,"Charlie Villanueva":0.45,"Chris Boucher":0.75,"Daniel Theis":0.75,"Davis Bertans":0.75,"Derrick White":0.75,"Devonte' Graham":0.75,"Donte DiVincenzo":0.75,"Drew Gooden":0.45,"Earl Watson":0.45,"Eddy Curry":0.45,"Eric Paschall":0.75,"Jalen Green":0.75,"Jameer Nelson":0.6,"James Johnson":0.6,"Jarred Vanderbilt":0.75,"Jarrett Jack":0.6,"Jeff Green":0.6,"Jeff Teague":0.6,"JJ Redick":0.6,"Joe Harris":0.75,"Joel Przybilla":0.45,"Jordan Clarkson":0.75,"Kenny Thomas":0.45,"Kentavious Caldwell-Pope":0.6,"Kurt Thomas":0.45,"Kyle Anderson":0.75,"Larry Nance Jr.":0.75,"Larry Sanders":0.6,"Lindsey Hunter":0.45,"Luis Scola":0.6,"Marcus Banks":0.45,"Mark Blount":0.45,"Marvin Williams":0.45,"Mason Plumlee":0.75,"Nicolas Batum":0.6,"OG Anunoby":0.75,"Patrick Beverley":0.6,"Rafer Alston":0.45,"Richaun Holmes":0.75,"Ricky Rubio":0.75,"Robert Covington":0.75,"Rui Hachimura":0.75,"Thaddeus Young":0.75,"Thomas Bryant":0.75,"Trenton Hassell":0.45,"Trevor Ariza":0.6,"Tristan Thompson":0.75,"Will Barton":0.75,"Aron Baynes":0.7,"Bobby Simmons":0.4,"Carlos Delfino":0.4,"Chucky Atkins":0.4,"Coby White":0.7,"Cody Zeller":0.7,"Daniel Gafford":0.7,"Dario Saric":0.55,"Dillon Brooks":0.7,"Duncan Robinson":0.7,"Gerald Green":0.55,"Gerald Henderson":0.55,"Immanuel Quickley":0.7,"Isaiah Stewart":0.7,"Ivica Zubac":0.7,"Jamario Moon":0.4,"Jared Sullinger":0.55,"Jason Kapono":0.4,"JaVale McGee":0.7,"Jeremy Lamb":0.7,"Josh Jackson":0.55,"Kelly Olynyk":0.7,"Kendrick Nunn":0.7,"Luguentz Dort":0.7,"Luke Kennard":0.7,"Luke Ridnour":0.4,"Marcus Morris Sr.":0.7,"Markieff Morris":0.55,"Marko Jaric":0.4,"Marquis Daniels":0.4,"Miles Bridges":0.7,"Miles Plumlee":0.55,"Monte Morris":0.7,"Nemanja Bjelica":0.7,"Nerlens Noel":0.7,"Nick Young":0.55,"PJ Washington":0.7,"Rodney Hood":0.55,"Ryan Anderson":0.55,"Saddiq Bey":0.7,"Sebastian Telfair":0.4,"Seth Curry":0.7,"T.J. McConnell":0.7,"Terrence Ross":0.7,"Troy Brown Jr.":0.7,"Vladimir Radmanovic":0.4,"Wesley Matthews":0.55,"Al Thornton":0.35,"Alec Burks":0.65,"Amir Johnson":0.5,"Anderson Varejao":0.35,"Anthony Johnson":0.35,"Bruce Brown":0.65,"Cameron Johnson":0.65,"Chris Duhon":0.35,"Cole Anthony":0.65,"Daniel Gibson":0.35,"Dewayne Dedmon":0.5,"Elfrid Payton":0.65,"Etan Thomas":0.35,"Fabricio Oberto":0.35,"Facundo Campazzo":0.65,"Gary Trent Jr.":0.65,"Hakim Warrick":0.35,"Jae'Sean Tate":0.65,"Jakob Poeltl":0.65,"Jalen Suggs":0.65,"James Wiseman":0.65,"Jarron Collins":0.35,"Jason Maxiell":0.35,"Josh Hart":0.65,"Justise Winslow":0.65,"Kevin Huerter":0.65,"Kevin Porter Jr.":0.65,"Kyle Kuzma":0.65,"Martell Webster":0.35,"Michael Kidd-Gilchrist":0.5,"Milos Teodosic":0.5,"Moses Brown":0.65,"Nenad Krstic":0.35,"Robin Lopez":0.5,"Ryan Gomes":0.35,"Shannon Brown":0.5,"Terance Mann":0.65,"Terrence Jones":0.5,"Tiago Splitter":0.5,"Tyler Johnson":0.5,"Tyrus Thomas":0.35,"Willie Cauley-Stein":0.65,"Willy Hernangomez":0.5,"Aaron Holiday":0.6,"Alex Caruso":0.6,"Alex Len":0.6,"Andre Roberson":0.45,"Anthony Bennett":0.45,"Bismack Biyombo":0.6,"Brian Skinner":0.3,"Cam Reddish":0.6,"Cameron Payne":0.6,"Carl Landry":0.45,"Charlie Bell":0.3,"Chris Wilcox":0.3,"Courtney Lee":0.45,"Danuel House Jr.":0.6,"Darko Milicic":0.3,"David Nwaba":0.6,"Davion Mitchell":0.6,"Delon Wright":0.6,"Dennis Smith Jr.":0.45,"Denzel Valentine":0.6,"DeShawn Stevenson":0.3,"Desmond Bane":0.6,"Dorian Finney-Smith":0.6,"Doug McDermott":0.6,"Dwight Powell":0.6,"Eddie House":0.3,"Ersan Ilyasova":0.6,"Frank Kaminsky III":0.6,"Gorgui Dieng":0.45,"Greivis Vasquez":0.45,"Jahlil Okafor":0.6,"JaMychal Green":0.6,"Jaxson Hayes":0.6,"Jeff Foster":0.3,"John Salmons":0.3,"Jordan Crawford":0.45,"Jordan Hill":0.45,"Jordan Poole":0.6,"Khem Birch":0.6,"KJ Martin":0.6,"Kris Dunn":0.6,"Kwame Brown":0.3,"Leon Powe":0.3,"Linas Kleiza":0.3,"Luc Richard Mbah a Moute":0.45,"Luke Walton":0.3,"Malik Monk":0.6,"Marcus Thornton":0.45,"Marquese Chriss":0.6,"Matt Barnes":0.45,"Maxi Kleber":0.6,"Melvin Ely":0.3,"Mo Bamba":0.6,"Moritz Wagner":0.6,"Naz Reid":0.6,"Nic Claxton":0.6,"Nikola Mirotic":0.45,"Obi Toppin":0.6,"Omer Asik":0.45,"Onyeka Okongwu":0.6,"Oshae Brissett":0.6,"P.J. Tucker":0.6,"Payton Pritchard":0.6,"Ramon Sessions":0.45,"Rasual Butler":0.3,"Rondae Hollis-Jefferson":0.6,"Royce O'Neale":0.6,"Sean Williams":0.3,"Shabazz Napier":0.6,"Shake Milton":0.6,"Skal Labissiere":0.45,"Spencer Hawes":0.45,"Talen Horton-Tucker":0.6,"Terence Davis":0.6,"Terrence Williams":0.45,"Tomas Satoransky":0.6,"Tony Battie":0.3,"Torrey Craig":0.6,"Treveon Graham":0.45,"Trevor Booker":0.45,"Trey Burke":0.6,"Tyus Jones":0.6,"Xavier Tillman":0.6,"Zaza Pachulia":0.45,"Abdel Nader":0.55,"Al-Farouq Aminu":0.55,"Alan Williams":0.4,"Allen Crabbe":0.4,"Allonzo Trier":0.55,"Amir Coffey":0.55,"Anfernee Simons":0.55,"Anthony Carter":0.25,"Avery Johnson":0.25,"Beno Udrih":0.25,"Boban Marjanovic":0.55,"Brandan Wright":0.4,"Brandon Bass":0.4,"Brandon Williams":0.55,"Bryn Forbes":0.55,"Carlos Arroyo":0.25,"Cedi Osman":0.55,"Chandler Hutchison":0.55,"Chris Andersen":0.4,"Chuma Okeke":0.55,"Corey Brewer":0.4,"Cory Joseph":0.55,"Darius Bazley":0.55,"De'Anthony Melton":0.55,"Dee Brown":0.25,"DeMarre Carroll":0.4,"Deni Avdija":0.55,"Derrick Jones Jr.":0.55,"DeSagana Diop":0.25,"Devin Brown":0.25,"Earl Boykins":0.25,"Edmond Sumner":0.55,"Francisco Elson":0.25,"Francisco Garcia":0.25,"Furkan Korkmaz":0.55,"Gary Neal":0.4,"Glen Davis":0.4,"Glenn Robinson III":0.55,"Harry Giles III":0.55,"Ian Mahinmi":0.4,"Isaac Okoro":0.55,"Isaiah Hartenstein":0.55,"Jaden McDaniels":0.55,"James Ennis III":0.55,"James Jones":0.25,"Jared Dudley":0.4,"Jason Thompson":0.4,"Jodie Meeks":0.4,"John Henson":0.55,"Jon Leuer":0.4,"Jonathan Kuminga":0.55,"Jonathon Simmons":0.4,"Jordan McLaughlin":0.55,"Josh Giddey":0.55,"Juan Toscano-Anderson":0.55,"Juancho Hernangomez":0.55,"Justin Holiday":0.55,"Kris Humphries":0.4,"Langston Galloway":0.55,"Lonnie Walker IV":0.55,"Marco Belinelli":0.4,"Mario Chalmers":0.4,"Matisse Thybulle":0.55,"Maurice Evans":0.25,"Meyers Leonard":0.55,"Nate Wolters":0.4,"Nazr Mohammed":0.25,"Nick Collison":0.25,"Nickeil Alexander-Walker":0.55,"Nicolo Melli":0.55,"Norris Cole":0.4,"Patrick Patterson":0.4,"Patrick Williams":0.55,"Precious Achiuwa":0.55,"Quinton Ross":0.25,"Raul Neto":0.55,"Saben Lee":0.55,"Shabazz Muhammad":0.4,"Speedy Claxton":0.25,"Taurean Prince":0.4,"Thabo Sefolosha":0.4,"Thomas Robinson":0.4,"Thon Maker":0.4,"Tony Bradley":0.55,"Tony Snell":0.55,"Travis Outlaw":0.25,"Trey Lyles":0.55,"Ty Jerome":0.55,"Tyler Ulis":0.4,"Wayne Ellington":0.55,"Zach Collins":0.55,"Caleb Martin":0.12,"Gabe Vincent":0.12,"Jeremy Sochan":0.12,"Kenyon Martin Jr.":0.12,"Max Strus":0.12,"Scoot Henderson":0.12,"Tre Jones":0.12,"Bol Bol":0.12,"Corey Kispert":0.12,"Josh Okogie":0.12,"Vasilije Micic":0.12,"AJ Griffin":0.12,"Aleksej Pokusevski":0.12,"Drew Eubanks":0.12,"Grant Williams":0.12,"Isaiah Joe":0.12,"Jaden Hardy":0.12,"Jalen McDaniels":0.12,"Jalen Smith":0.12,"Jaylen Nowell":0.12,"Jordan Nwora":0.12,"Jose Alvarado":0.12,"Josh Green":0.12,"Kenrich Williams":0.12,"Malaki Branham":0.12,"Nick Richards":0.12,"Ochai Agbaji":0.12,"Paul Reed":0.12,"Reggie Bullock Jr.":0.12,"Trendon Watford":0.12,"Bones Hyland":0.12,"Charles Bassey":0.12,"Chimezie Metu":0.12,"Chris Duarte":0.12,"Damion Lee":0.12,"Isaiah Jackson":0.12,"Javonte Green":0.12,"Jeremiah Robinson-Earl":0.12,"Jevon Carter":0.12,"Keita Bates-Diop":0.12,"Killian Hayes":0.12,"Landry Shamet":0.12,"Mike Muscala":0.12,"Naji Marshall":0.12,"Nassir Little":0.12,"Pat Connaughton":0.12,"Santi Aldama":0.12,"Sasha Vezenkov":0.12,"Tre Mann":0.12,"Aaron Wiggins":0.12,"Ayo Dosunmu":0.12,"Bruno Fernando":0.12,"Cody Martin":0.12,"Goga Bitadze":0.12,"Haywood Highsmith":0.12,"Isaiah Livers":0.12,"Jarace Walker":0.12,"Jericho Sims":0.12,"Jock Landale":0.12,"Josh Primo":0.12,"Miles McBride":0.12,"Omer Yurtseven":0.12,"Brandin Podziemski":0.12,"Jaime Jaquez Jr.":0.12,"Cam Whitmore":0.12,"Keyonte George":0.12,"Tyson Etienne":0.12,"Bilal Coulibaly":0.12,"Keon Ellis":0.12,"Vince Williams Jr.":0.12,"Cason Wallace":0.12,"Gradey Dick":0.12,"Luke Kornet":0.12,"Moses Moody":0.12,"Nikola Jovic":0.12,"Simone Fontecchio":0.12,"Taylor Hendricks":0.12,"Trayce Jackson-Davis":0.12,"Dalano Banton":0.12,"Dante Exum":0.12,"Peyton Watson":0.12,"Sam Hauser":0.12,"Anthony Black":0.12,"Day'Ron Sharpe":0.12,"Duop Reath":0.12,"Guerschon Yabusele":0.12,"Jabari Walker":0.12,"Jake LaRavia":0.12,"Jordan Goodwin":0.12,"Lamar Stevens":0.12,"Lindy Waters III":0.12,"Malachi Flynn":0.12,"Marcus Sasser":0.12,"Noah Clowney":0.12,"Sam Merrill":0.12,"Scotty Pippen Jr.":0.12,"Dalen Terry":0.12,"David Roddy":0.12,"Donovan Clingan":0.12,"Georges Niang":0.12,"Jordan Hawkins":0.12,"Julian Champagnie":0.12,"Julian Strawther":0.12,"Kris Murray":0.12,"MarJon Beauchamp":0.12,"Max Christie":0.12,"Kel'el Ware":0.12,"Matas Buzelis":0.12,"Yves Missi":0.12,"Zach Edey":0.12,"Bub Carrington":0.12,"Dylan Harper":0.12,"Isaiah Collier":0.12,"Kyle Filipowski":0.12,"Ace Bailey":0.12,"Kyshawn George":0.12,"Dalton Knecht":0.12,"Jay Huff":0.12,"Jaylen Wells":0.12,"VJ Edgecombe":0.12,"Brice Sensabaugh":0.12,"Justin Edwards":0.12,"Karlo Matkovic":0.12,"Kon Knueppel":0.12,"Ryan Dunn":0.12,"Ryan Rollins":0.12,"Sandro Mamukelashvili":0.12,"Tre Johnson":0.12,"Ziaire Williams":0.12,"AJ Green":0.12,"AJ Johnson":0.12,"Adem Bona":0.12,"Ben Sheppard":0.12,"Dean Wade":0.12,"Devin Carter":0.12,"Ja'Kobe Walter":0.12,"Jalen Wilson":0.12,"Jonathan Mogbo":0.12,"Justin Champagnie":0.12,"Khaman Maluach":0.12,"Mouhamed Gueye":0.12,"Neemias Queta":0.12,"Nick Smith Jr.":0.12,"Pelle Larsson":0.12,"Quinten Post":0.12,"Rob Dillingham":0.12,"Ron Holland II":0.12,"Tristan da Silva":0.12,"AJ Lawson":0.12,"Ajay Mitchell":0.12,"Derik Queen":0.12,"Gui Santos":0.12,"Walker Kessler":0.5,"Robert Williams III":0.5,"Devin Vassell":0.5,"Bennedict Mathurin":0.5,"Jaden Ivey":0.5,"Keegan Murray":0.5,"Herbert Jones":0.5,"Jabari Smith Jr.":0.5,"Jalen Duren":0.5,"Trey Murphy III":0.5,"Brandon Miller":0.5,"Shaedon Sharpe":0.5,"Tari Eason":0.5,"Mark Williams":0.5,"Quentin Grimes":0.5,"Aaron Nesmith":0.5,"Andrew Nembhard":0.5,"Ausar Thompson":0.5,"Cam Thomas":0.5,"Christian Braun":0.5,"Dyson Daniels":0.5,"Jalen Johnson":0.5,"Dereck Lively II":0.5,"Alex Sarr":0.5,"Zaccharie Risacher":0.5,"Toumani Camara":0.5,"Cooper Flagg":0.5,"Stephon Castle":0.5,"Jared McCain":0.5,"Amen Thompson":0.85};

/* ---- pull-memory randomizer (self-contained) ----
   PULL_AT[id] = pack number the player was last pulled; PACK_NO ticks once per opened pack.
   pullWeight: near-zero if pulled within the last pack, decaying smoothly back to full
   odds over ~9 packs. TIER_DECKS: Elite/Icon players can't repeat until the whole tier
   has cycled. All state persisted; nothing else in the app touches it. */
let PACK_NO=0,PULL_AT={},NAME_PULL_AT={},TIER_DECKS=null; /* hydrated from storage in the app script */
function shuffleInPlace(a,rng){const R=rng||Math.random;for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function deckRefill(t,rng){TIER_DECKS[t]=shuffleInPlace(POOLS[t].map(p=>p.id),rng);}
function reconcileDeck(t,rng){ /* keep valid unique ids; fold in only cards NOT YET dealt this cycle
     (a card already pulled has a PULL_AT stamp and must stay out until the deck empties) */
  const valid=new Set(POOLS[t].map(p=>p.id));
  let d=Array.isArray(TIER_DECKS[t])?TIER_DECKS[t].filter((id,i,a)=>valid.has(id)&&a.indexOf(id)===i):[];
  const present=new Set(d);
  const missing=[...valid].filter(id=>!present.has(id)&&PULL_AT[id]===undefined); /* genuinely-new only */
  if(missing.length){shuffleInPlace(missing,rng);d.push(...missing);shuffleInPlace(d,rng);}
  TIER_DECKS[t]=d;
}
function decksReady(rng){if(!TIER_DECKS)TIER_DECKS={};TIER_ORDER.forEach(t=>reconcileDeck(t,rng));}
function persistRand(){if(typeof sSet!=="function")return;
  sSet("atu-packno-v2",PACK_NO);sSet("atu-pullhist-v2",PULL_AT);sSet("atu-namehist-v2",NAME_PULL_AT);sSet("atu-decks-v2",TIER_DECKS);}
function pullWeight(p){ /* decays by BOTH exact-card and player-NAME recency (kills variant clustering) */
  const idAt=PULL_AT[p.id],nameAt=NAME_PULL_AT[p.name];let w=SPOTLIGHT[p.name]??1;
  if(idAt!==undefined){const age=PACK_NO-idAt;w*=age<=1?0.01:Math.max(0.08,Math.min(1,(age-1)/9));}
  if(nameAt!==undefined){const age=PACK_NO-nameAt;w*=age<=1?0.02:age===2?0.08:age===3?0.20:age===4?0.38:age===5?0.58:age===6?0.80:1;}
  return w;
}
function pickPlayer(pool,rng){
  pool=pool.filter(p=>p.acquisitionActive!==false);
  if(!pool.length)return null;
  const R=rng||Math.random;decksReady(R);
  const tier=pool[0].tier;
  if(!TIER_DECKS[tier].length){ /* full cycle done: forget this tier's id-stamps so every card returns */
    POOLS[tier].forEach(p=>{delete PULL_AT[p.id];});
    deckRefill(tier,R);
  }
  const allowed=new Set(pool.map(p=>p.id));
  let ids=TIER_DECKS[tier].filter(id=>allowed.has(id));
  if(!ids.length){ /* a constrained subset (e.g. Elite centers) emptied before the full tier:
       re-insert ONLY that subset back into the deck — never borrow past the deck, never cross tiers */
    ids=shuffleInPlace(pool.map(p=>p.id),R);TIER_DECKS[tier].push(...ids);
  }
  const cands=ids.map(id=>DB[id]),wts=cands.map(p=>pullWeight(p));
  let r=R()*wts.reduce((a,b)=>a+b,0),pick=cands[cands.length-1];
  for(let i=0;i<cands.length;i++){r-=wts[i];if(r<0){pick=cands[i];break;}}
  const ix=TIER_DECKS[tier].indexOf(pick.id);if(ix>-1)TIER_DECKS[tier].splice(ix,1);
  PULL_AT[pick.id]=PACK_NO;NAME_PULL_AT[pick.name]=PACK_NO;
  return pick;
}
function unpickPlayer(p){ /* a rolled card replaced by guarantee logic was never shown: refund its memory */
  if(TIER_DECKS[p.tier]&&!TIER_DECKS[p.tier].includes(p.id))TIER_DECKS[p.tier].push(p.id);
  delete PULL_AT[p.id];
}
function rollCard(packKey,excl,rng){
  const t=rollTier(PACKS[packKey].odds,rng);
  let pool;
  if(packKey==="rare")pool=t==="Gold"?POOL_90.filter(p=>p.ovr<=91):POOLS[t];
  else pool=POOLS[t];
  let open=pool.filter(p=>!excl.has(p.id));
  if(!open.length)open=packUniverse(packKey).filter(p=>!excl.has(p.id)); // tier exhausted: widen
  /* tier odds strictly picked the pool; the card comes from the pull-memory picker */
  return pickPlayer(open,rng);
}
function rollPack(packKey,owned,rng){
  const pk=PACKS[packKey];
  PACK_NO++;
  let excl=new Set(owned||[]);
  /* uniqueness is per CARD (name+team+era = its id): other versions of an owned
     player stay pullable. Only exact copies are excluded — and once fewer than
     3 unowned cards remain, exact dupes become pullable and are auto-discarded. */
  if(packUniverse(packKey).filter(p=>!excl.has(p.id)).length<3)excl=new Set();
  const cards=[];
  for(let i=0;i<3;i++){const c=rollCard(packKey,excl,rng);cards.push(c);excl.add(c.id);}
  if(pk.guarTier&&!cards.some(c=>tierRank(c.tier)>=tierRank(pk.guarTier))){
    // upgrade the last card to satisfy the guarantee
    const floor=tierRank(pk.guarTier);
    excl.delete(cards[2].id);
    const hi=TIER_ORDER.slice(floor).flatMap(t=>POOLS[t]).filter(p=>!excl.has(p.id));
    if(hi.length){unpickPlayer(cards[2]);cards[2]=pickPlayer(hi,rng);}
  }
  persistRand();
  return cards;
}

/* ================= ROSTER / CHEMISTRY / OVR ================= */
const STARTER_SLOTS=["PG","SG","SF","PF","C"];
const BENCH_SLOTS=["B1","B2","B3"];
const ALL_SLOTS=[...STARTER_SLOTS,...BENCH_SLOTS];
function emptyRoster(){const r={};ALL_SLOTS.forEach(s=>r[s]=null);return r;}
function slotPos(slot){return STARTER_SLOTS.includes(slot)?slot:"B";}
function eligible(player,slot){const legacy=legacyRunView();if(legacy&&legacy.DB[player.id])return legacy.eligible(legacy.DB[player.id],slot);const p=slotPos(slot);return p==="B"||player.positions.includes(p);}
function rosterHas(roster,pid){return ALL_SLOTS.some(s=>roster[s]===pid);}

/* ---- Iconic Duos & Trios: name-based chemistry, card team/era irrelevant ----
   +0.6 per link (duo 0.6, full trio 1.2), scored inside the tag cap of 5 so the
   total chemistry ceiling is unchanged. A duo that is a subset of an already-credited
   larger group never double-pays. */
const DUO_W=0.5;
const DUOS=[
  {
    "l": "Jordan & Pippen",
    "m": [
      "Michael Jordan",
      "Scottie Pippen"
    ]
  },
  {
    "l": "Shaq & Kobe",
    "m": [
      "Shaquille O'Neal",
      "Kobe Bryant"
    ]
  },
  {
    "l": "Magic & Kareem",
    "m": [
      "Magic Johnson",
      "Kareem Abdul-Jabbar"
    ]
  },
  {
    "l": "Splash Brothers",
    "m": [
      "Stephen Curry",
      "Klay Thompson"
    ]
  },
  {
    "l": "LeBron & Wade",
    "m": [
      "LeBron James",
      "Dwyane Wade"
    ]
  },
  {
    "l": "Bird & McHale",
    "m": [
      "Larry Bird",
      "Kevin McHale"
    ]
  },
  {
    "l": "Russell & Cousy",
    "m": [
      "Bill Russell",
      "Bob Cousy"
    ]
  },
  {
    "l": "Kobe & Pau",
    "m": [
      "Kobe Bryant",
      "Pau Gasol"
    ]
  },
  {
    "l": "Twin Towers",
    "m": [
      "Tim Duncan",
      "David Robinson"
    ]
  },
  {
    "l": "Duncan & Parker",
    "m": [
      "Tim Duncan",
      "Tony Parker"
    ]
  },
  {
    "l": "LeBron & AD",
    "m": [
      "LeBron James",
      "Anthony Davis"
    ]
  },
  {
    "l": "LeBron & Kyrie",
    "m": [
      "LeBron James",
      "Kyrie Irving"
    ]
  },
  {
    "l": "KD & Curry",
    "m": [
      "Kevin Durant",
      "Stephen Curry"
    ]
  },
  {
    "l": "Hakeem & Drexler",
    "m": [
      "Hakeem Olajuwon",
      "Clyde Drexler"
    ]
  },
  {
    "l": "Dr. J & Moses",
    "m": [
      "Julius Erving",
      "Moses Malone"
    ]
  },
  {
    "l": "Isiah & Dumars",
    "m": [
      "Isiah Thomas",
      "Joe Dumars"
    ]
  },
  {
    "l": "West & Wilt",
    "m": [
      "Jerry West",
      "Wilt Chamberlain"
    ]
  },
  {
    "l": "Clyde & The Pearl",
    "m": [
      "Walt Frazier",
      "Earl Monroe"
    ]
  },
  {
    "l": "Oscar & Kareem",
    "m": [
      "Oscar Robertson",
      "Kareem Abdul-Jabbar"
    ]
  },
  {
    "l": "Jokic & Murray",
    "m": [
      "Nikola Jokic",
      "Jamal Murray"
    ]
  },
  {
    "l": "Giannis & Middleton",
    "m": [
      "Giannis Antetokounmpo",
      "Khris Middleton"
    ]
  },
  {
    "l": "Tatum & Brown",
    "m": [
      "Jayson Tatum",
      "Jaylen Brown"
    ]
  },
  {
    "l": "Stockton & Malone",
    "m": [
      "John Stockton",
      "Karl Malone"
    ]
  },
  {
    "l": "West & Baylor",
    "m": [
      "Jerry West",
      "Elgin Baylor"
    ]
  },
  {
    "l": "Payton & Kemp",
    "m": [
      "Gary Payton",
      "Shawn Kemp"
    ]
  },
  {
    "l": "Penny & Shaq",
    "m": [
      "Penny Hardaway",
      "Shaquille O'Neal"
    ]
  },
  {
    "l": "Nash & Amar'e",
    "m": [
      "Steve Nash",
      "Amar'e Stoudemire"
    ]
  },
  {
    "l": "Lob City",
    "m": [
      "Chris Paul",
      "Blake Griffin"
    ]
  },
  {
    "l": "Harden & CP3",
    "m": [
      "James Harden",
      "Chris Paul"
    ]
  },
  {
    "l": "KD & Russ",
    "m": [
      "Kevin Durant",
      "Russell Westbrook"
    ]
  },
  {
    "l": "Luka & Kyrie",
    "m": [
      "Luka Doncic",
      "Kyrie Irving"
    ]
  },
  {
    "l": "DeRozan & Lowry",
    "m": [
      "DeMar DeRozan",
      "Kyle Lowry"
    ]
  },
  {
    "l": "Webber & Bibby",
    "m": [
      "Chris Webber",
      "Mike Bibby"
    ]
  },
  {
    "l": "Davis & Richardson",
    "m": [
      "Baron Davis",
      "Jason Richardson"
    ]
  },
  {
    "l": "Grit & Grind",
    "m": [
      "Mike Conley",
      "Marc Gasol"
    ]
  },
  {
    "l": "Spurs Big Three",
    "m": [
      "Tim Duncan",
      "Tony Parker",
      "Manu Ginobili"
    ]
  },
  {
    "l": "Bulls Second Threepeat",
    "m": [
      "Michael Jordan",
      "Scottie Pippen",
      "Dennis Rodman",
      "Ron Harper"
    ]
  },
  {
    "l": "Bulls First Threepeat",
    "m": [
      "Michael Jordan",
      "Scottie Pippen",
      "Horace Grant",
      "B.J. Armstrong"
    ]
  },
  {
    "l": "Celtics Big Three '80s",
    "m": [
      "Larry Bird",
      "Kevin McHale",
      "Robert Parish"
    ]
  },
  {
    "l": "Showtime Trio",
    "m": [
      "Magic Johnson",
      "Kareem Abdul-Jabbar",
      "James Worthy"
    ]
  },
  {
    "l": "Showtime Wilkes",
    "m": [
      "Magic Johnson",
      "Kareem Abdul-Jabbar",
      "Jamaal Wilkes"
    ]
  },
  {
    "l": "Warriors Core",
    "m": [
      "Stephen Curry",
      "Klay Thompson",
      "Draymond Green"
    ]
  },
  {
    "l": "Hamptons Five Wings",
    "m": [
      "Stephen Curry",
      "Kevin Durant",
      "Klay Thompson"
    ]
  },
  {
    "l": "Curry KD Draymond",
    "m": [
      "Stephen Curry",
      "Kevin Durant",
      "Draymond Green"
    ]
  },
  {
    "l": "Heatles",
    "m": [
      "LeBron James",
      "Dwyane Wade",
      "Chris Bosh"
    ]
  },
  {
    "l": "Russell Jones Havlicek",
    "m": [
      "Bill Russell",
      "Sam Jones",
      "John Havlicek"
    ]
  },
  {
    "l": "Russell Cousy Heinsohn",
    "m": [
      "Bill Russell",
      "Bob Cousy",
      "Tommy Heinsohn"
    ]
  },
  {
    "l": "Bad Boys Core",
    "m": [
      "Isiah Thomas",
      "Joe Dumars",
      "Dennis Rodman",
      "Mark Aguirre"
    ]
  },
  {
    "l": "Celtics Big Three '08",
    "m": [
      "Kevin Garnett",
      "Paul Pierce",
      "Ray Allen"
    ]
  },
  {
    "l": "Cavs Big Three",
    "m": [
      "LeBron James",
      "Kyrie Irving",
      "Kevin Love"
    ]
  },
  {
    "l": "Lakers '69 Trio",
    "m": [
      "Wilt Chamberlain",
      "Jerry West",
      "Elgin Baylor"
    ]
  },
  {
    "l": "Sixers '83",
    "m": [
      "Moses Malone",
      "Julius Erving",
      "Maurice Cheeks",
      "Bobby Jones"
    ]
  },
  {
    "l": "Knicks '73",
    "m": [
      "Walt Frazier",
      "Earl Monroe",
      "Willis Reed"
    ]
  },
  {
    "l": "Goin' to Work Pistons",
    "m": [
      "Ben Wallace",
      "Chauncey Billups",
      "Richard Hamilton"
    ]
  },
  {
    "l": "Nets Finals Core",
    "m": [
      "Jason Kidd",
      "Richard Jefferson",
      "Kenyon Martin"
    ]
  },
  {
    "l": "Mavs '11 Core",
    "m": [
      "Dirk Nowitzki",
      "Jason Terry",
      "Jason Kidd",
      "Tyson Chandler"
    ]
  },
  {
    "l": "Heat Culture Trio",
    "m": [
      "Jimmy Butler",
      "Bam Adebayo",
      "Tyler Herro"
    ]
  },
  {
    "l": "OKC Big Three",
    "m": [
      "Kevin Durant",
      "Russell Westbrook",
      "James Harden"
    ]
  },
  {
    "l": "Nets Big Three",
    "m": [
      "Kevin Durant",
      "Kyrie Irving",
      "James Harden"
    ]
  },
  {
    "l": "Kings '02 Core",
    "m": [
      "Chris Webber",
      "Vlade Divac",
      "Mike Bibby",
      "Doug Christie"
    ]
  },
  {
    "l": "Seven Seconds or Less",
    "m": [
      "Steve Nash",
      "Amar'e Stoudemire",
      "Shawn Marion"
    ]
  },
  {
    "l": "Run TMC",
    "m": [
      "Tim Hardaway",
      "Mitch Richmond",
      "Chris Mullin"
    ]
  },
  {
    "l": "Bucks '01 Trio",
    "m": [
      "Ray Allen",
      "Glenn Robinson",
      "Sam Cassell"
    ]
  },
  {
    "l": "Pacers '13 Core",
    "m": [
      "Paul George",
      "Roy Hibbert",
      "David West"
    ]
  }
];
const DUO_PAIRS=new Set();
DUOS.forEach(g=>{for(let i=0;i<g.m.length;i++)for(let j=i+1;j<g.m.length;j++){
  DUO_PAIRS.add(g.m[i]+"|"+g.m[j]);DUO_PAIRS.add(g.m[j]+"|"+g.m[i]);}});
function duoBonus(starters,links){
  const on=new Set(starters.map(p=>p.name));
  const groups=DUOS.map(g=>({l:g.l,present:g.m.filter(n=>on.has(n))}))
    .filter(g=>g.present.length>=2)
    .sort((a,b)=>b.present.length-a.present.length);
  let total=0;const credited=[];
  for(const g of groups){
    if(credited.some(big=>g.present.every(n=>big.has(n))))continue;
    const b=+(((g.present.length-1)*DUO_W).toFixed(1));
    total+=b;
    if(links)links.push({label:g.l,n:g.present.length,bonus:b,kind:"duo"});
    credited.push(new Set(g.present));
  }
  return total;
}
/* Team-core payout by how many starters share a franchise, tapered so the 4th and 5th
   same-jersey starter add less than the 2nd and 3rd. Still the biggest single link, but a
   five-man stack no longer buys most of the chemistry budget on its own. */
const CORE_STEP=[0,0,1.35,2.5,3.45,4.0];
function rosterMinOvr(roster){
  const ids=ALL_SLOTS.map(s=>roster[s]).filter(id=>id!=null);
  return ids.length?Math.min(...ids.map(id=>DB[id].ovr)):0;
}
function legacyRunView(){return null;}
function chemistry(roster){
  const legacy=legacyRunView();if(legacy)return legacy.chemistry(roster);
  const links=[];
  /* team cores: starters sharing a franchise (strongest link) */
  const counts={};
  STARTER_SLOTS.forEach(s=>{const pid=roster[s];if(pid==null)return;
    const t=DB[pid].team;counts[t]=(counts[t]||0)+1;});
  let team=0;
  Object.entries(counts).forEach(([t,n])=>{
    if(n>=2){const b=CORE_STEP[Math.min(5,n)];team+=b;links.push({label:t+" Core",n,bonus:b,kind:"team"});}});
  team=Math.min(CORE_STEP[5],team);
  /* tag synergies: scan starters + bench; unique player NAMES per tag so two
     versions of the same player never self-link */
  /* STARTERS ONLY: the bench is ignored entirely for chemistry */
  const groups={};
  STARTER_SLOTS.forEach(s=>{const pid=roster[s];if(pid==null)return;
    DB[pid].tags.forEach(t=>{(groups[t]=groups[t]||new Set()).add(DB[pid].name);});});
  let tag=0;
  Object.entries(groups).forEach(([t,names])=>{
    const n=names.size;if(n<2)return;
    const w=t.startsWith("Story_")?0.4:0.25; /* rare story links pay more than era/style */
    const b=+((n-1)*w).toFixed(1);
    tag+=b;links.push({label:TAG_LABEL[t]||t,n,bonus:b,
      kind:t.startsWith("Story_")?"story":t.startsWith("Era_")?"era":"style"});});
  tag+=duoBonus(STARTER_SLOTS.filter(s=>roster[s]!=null).map(s=>DB[roster[s]]),links);
  tag=Math.min(4.5,tag); /* duos live inside the same cap — total ceiling unchanged */
  links.sort((a,b)=>b.bonus-a.bonus);
  const bonus=+Math.min(10,team+tag).toFixed(1);
  return {bonus,links};
}
function startersFull(roster){return STARTER_SLOTS.every(s=>roster[s]!=null);}
function teamOVR(roster){
  const legacy=legacyRunView();if(legacy)return legacy.teamOVR(roster);
  /* starting five = 70% of team OVR, bench = 30% */
  const sv=STARTER_SLOTS.map(s=>roster[s]==null?60:Math.max(60,DB[roster[s]].ovr));
  const bv=BENCH_SLOTS.map(s=>roster[s]==null?60:Math.max(60,DB[roster[s]].ovr));
  const base=(sv.reduce((a,b)=>a+b,0)/5)*0.70+(bv.reduce((a,b)=>a+b,0)/3)*0.30;
  const chem=chemistry(roster);
  const total=Math.max(60,Math.min(99,Math.round(base+chem.bonus)));
  /* effective rating drives the win curve: chemistry counts double there,
     so a lower-OVR team with perfect chem can out-project a chem-less one */
  let eff=base+chem.bonus*CHEM_WIN_MULT; /* Phase 2 tune: chemistry remains decisive without making 82–0 routine */
  const full=startersFull(roster)&&BENCH_SLOTS.every(s=>roster[s]!=null);
  /* Perfection gate: a roster is only allowed to reach 82–0 if EVERY card is Gold or
     better. Chemistry alone used to carry a five-man jersey stack with a 66-rated bench
     to a perfect season; the weakest link now caps the ceiling instead. */
  const minOvr=full?rosterMinOvr(roster):0;
  const gated=full&&minOvr<PERFECT_MIN_OVR;
  if(gated)eff=Math.min(eff,EFF_CAP_NO_PERFECT);
  return {base:Math.round(base),chem,total,eff,ready:startersFull(roster),full,minOvr,gated};
}
/* logistic-style win curve on anchor points with cosine easing between them:
   flat-ish under 75, climbing through the 80s, exploding past 90 */
const CHEM_WIN_MULT=2.10; /* shared by teamOVR and the near-miss readout — must stay top-level */
/* GMM: upper cosine anchor, not the rounded 82-win boundary.
   103.6 targets original optimised-play difficulty with the updated roster.
   Deploy with the roster/pool release; the original control remains frozen. */
const EIGHTY_TWO_EFF=103.6;
const PROJ=[[60,15],[70,26],[75,31],[80,38],[84,46],[87,54],[90,65],[92,70],[95,76],[97,78],[100,80],[EIGHTY_TWO_EFF,82]];
const PERFECT_MIN_OVR=85; /* Gold — every one of the eight must clear this for 82–0 */
function recordIdentity(wins){
  if(wins>=82)return {title:"82–0 Club",sub:"Perfection certified",cls:"rid-perfect",stamp:"TRUE 82–0"};
  if(wins===81)return {title:"Perfect Season Threat",sub:"One loss from immortality",cls:"rid-near"};
  if(wins===80)return {title:"One for the Ages",sub:"Historic without perfection",cls:"rid-near"};
  if(wins>=77)return {title:"Dynasty Material",sub:"An all-time powerhouse",cls:"rid-great"};
  if(wins>=72)return {title:"All-Time Great",sub:"Historic championship level",cls:"rid-great"};
  if(wins>=66)return {title:"Finals Favorite",sub:"Built to own June",cls:"rid-contender"};
  if(wins>=60)return {title:"Title Contender",sub:"A real championship window",cls:"rid-contender"};
  if(wins>=54)return {title:"Conference Threat",sub:"Dangerous deep into May",cls:"rid-contender"};
  if(wins>=47)return {title:"Homecourt Bullies",sub:"A brutal first-round draw",cls:"rid-playoff"};
  if(wins>=40)return {title:"Playoff Team",sub:"Good enough to matter",cls:"rid-playoff"};
  if(wins>=30)return {title:"Play-In Pests",sub:"Annoying, alive, unfinished",cls:""};
  if(wins>=20)return {title:"Rebuilding",sub:"Pieces exist; wins do not",cls:""};
  return {title:"Lottery Lifers",sub:"Back to the draft board",cls:""};
}
function projection(eff){
  const legacy=legacyRunView();if(legacy)return legacy.projection(eff);
  const e=Math.max(60,Math.min(EIGHTY_TWO_EFF,eff));
  let wins=PROJ[PROJ.length-1][1];
  for(let i=0;i<PROJ.length-1;i++){const [a,wa]=PROJ[i],[b,wb]=PROJ[i+1];
    if(e<=b){const t=(e-a)/(b-a),s=(1-Math.cos(Math.PI*t))/2; /* smooth, non-linear */
      wins=Math.round(wa+(wb-wa)*s);break;}}
  wins=Math.max(12,Math.min(82,wins));
  const identity=recordIdentity(wins);
  return {wins,losses:82-wins,label:identity.title,identity};
}
/* highest effective rating that still projects 81 wins — the ceiling applied to any
   roster carrying a sub-Gold card. Derived from the curve so it tracks EIGHTY_TWO_EFF. */
const PERFECT_BOUNDARY=(()=>{let lo=60,hi=EIGHTY_TWO_EFF;
  for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(projection(mid).wins>=82)hi=mid;else lo=mid;}
  return {cap:lo,winning:hi};})();
const EFF_CAP_NO_PERFECT=PERFECT_BOUNDARY.cap;
function recordIdentityHTML(pr,ready,clubEligible=true){
  if(!clubEligible&&pr.wins===82)return `<div class="recordid"><div><div class="rid-main">Perfect projection</div><div class="rid-sub">Unranked · not eligible for the 82–0 Club</div></div><div class="rid-record">82–0</div></div>`;
  /* live verdict from the first pick — empty slots still count as 60, so the record
     climbs as the roster fills rather than sitting blank until it is complete */
  if(!ready){const j=pr.identity||recordIdentity(pr.wins);
    return `<div class="recordid"><div><div class="rid-main">${j.title}</div><div class="rid-sub">so far — fill the starting five</div></div><div class="rid-record">${pr.wins}–${pr.losses}</div></div>`;}
  const i=pr.identity||recordIdentity(pr.wins);
  return `<div class="recordid ${i.cls}"><div><div class="rid-main">${i.title}</div><div class="rid-sub">${i.sub}</div></div><div class="rid-record">${pr.wins}–${pr.losses}</div></div>`;
}
function nearMissChem(o){
  const legacy=legacyRunView();if(legacy)return legacy.nearMissChem(o);
  if(!o.ready)return null;
  if(o.full&&o.minOvr<PERFECT_MIN_OVR)return {hit:false,needed:null,gated:true};
  const pr=projection(o.eff);if(pr.wins>=82)return {hit:true,needed:0};
  const needed=Math.max(0,(PERFECT_BOUNDARY.winning-o.eff)/CHEM_WIN_MULT);
  return {hit:false,needed:Math.max(0.1,Math.ceil((needed-1e-10)*10)/10)};
}
function nearMissHTML(o){
  if(!o.full)return ""; /* only meaningful once ALL 8 slots (incl bench) are set — otherwise the number shifts as cards are added, not just from chemistry */
  const n=nearMissChem(o);if(!n)return "";
  if(n.gated)return `<div class="near82"><b>ALL EIGHT CARDS MUST BE 85+</b> FOR 82–0</div>`;
  return n.hit
    ?`<div class="near82 hit">82–0 STANDARD REACHED</div>`
    :`<div class="near82"><b>+${n.needed.toFixed(1)} CHEM</b> FROM 82–0</div>`;
}

/* draft option weights (kept generous so drafts feel good) */
const DRAFT_ODDS={Bronze:.14,Silver:.40,Gold:.40,Elite:.04,Icon:.02};
const DRAFT_LIMITS={Icon:2,Elite:4}; /* per draft, captain included */
/* CLASSIC MODE: balanced drop curve with hard high-tier ceilings per session */
const CLASSIC_ODDS={Bronze:.37,Silver:.425,Gold:.16,Elite:.037,Icon:.008};
const CLASSIC_PREMIUM_ODDS={Silver:.525,Gold:.35,Elite:.10,Icon:.025};
const CLASSIC_LIMITS={Icon:2,Elite:4}; /* hard caps per classic run */
function classicDowngrade(t,counts,limits){
  const L=limits||CLASSIC_LIMITS,order=["Icon","Elite","Gold"];
  let i=order.indexOf(t);
  while(i>-1&&i<2&&L[order[i]]&&(counts[order[i]]||0)>=L[order[i]])i++;
  return i===-1?t:order[i]||t;
}
function classicRollPack(owned,counts,packKey,rng){
  const odds=packKey==="premium"?CLASSIC_PREMIUM_ODDS:CLASSIC_ODDS;
  PACK_NO++;
  const excl=new Set(owned||[]),cards=[];
  for(let k=0;k<3;k++){
    let t=classicDowngrade(rollTier(odds,rng),counts);
    let open=rosterPoolCards(t,packRosterPool()).filter(p=>!excl.has(p.id));
    if(!open.length)open=ACTIVE_CARDS.filter(p=>(packRosterPool()==="history"||p.modernEligible)&&!excl.has(p.id));
    const c=pickPlayer(open,rng);
    cards.push(c);excl.add(c.id);
    if(tierRank(c.tier)>=tierRank("Elite"))counts[c.tier]=(counts[c.tier]||0)+1;
  }
  /* mandatory role-player distribution: every pack carries at least one Silver-or-lower */
  if(!cards.some(c=>tierRank(c.tier)<=tierRank("Silver"))){
    const low=[...rosterPoolCards("Bronze",packRosterPool()),...rosterPoolCards("Silver",packRosterPool())].filter(p=>!excl.has(p.id)&&p.id!==cards[2].id);
    if(low.length){
      if(tierRank(cards[2].tier)>=tierRank("Elite"))counts[cards[2].tier]--;
      unpickPlayer(cards[2]);
      cards[2]=pickPlayer(low,rng);
    }
  }
  persistRand();
  return cards;
}
/* DRAFT MODE: independent, name-balanced randomizer.
   Why this is separate from packs:
   - pack pull history/decks are persisted on the device and were leaking into Draft;
   - players with 2–3 card variants otherwise received 2–3 lottery tickets;
   - multi-position players otherwise appeared on far more slot boards.
   Draft now chooses a PLAYER NAME first, then one eligible card version. Persistent
   exposure counts + a strong recent-session cooldown keep long-run appearances even,
   while a current-draft soft block avoids showing the same unpicked name repeatedly. */
const DRAFT_FAIR_KEY="atu-draft-fair-v1";
let DRAFT_FAIR_SESSION=0,DRAFT_NAME_SHOWN={},DRAFT_NAME_LAST={},DRAFT_CARD_SHOWN={};
function persistDraftFair(){if(typeof sSet!=="function")return;
  sSet(DRAFT_FAIR_KEY,{session:DRAFT_FAIR_SESSION,shown:DRAFT_NAME_SHOWN,last:DRAFT_NAME_LAST,cards:DRAFT_CARD_SHOWN});}
function beginDraftFairSession(){
  DRAFT_FAIR_SESSION++;
  /* bounded memory: preserve relative fairness without letting counters grow forever */
  if(DRAFT_FAIR_SESSION%100===0){
    Object.keys(DRAFT_NAME_SHOWN).forEach(n=>DRAFT_NAME_SHOWN[n]=Math.floor(DRAFT_NAME_SHOWN[n]*0.75));
    Object.keys(DRAFT_CARD_SHOWN).forEach(id=>DRAFT_CARD_SHOWN[id]=Math.floor(DRAFT_CARD_SHOWN[id]*0.75));
  }
  persistDraftFair();
}
function weightedIndex(weights,rng){
  const R=rng||Math.random,total=weights.reduce((a,b)=>a+b,0);
  if(!(total>0))return Math.floor(R()*weights.length);
  let r=R()*total;
  for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}
  return weights.length-1;
}
function isDepthOnly(p){return (SPOTLIGHT[p.name]??1)<=0.15;}
/* shared Captain Pack helper for Pack Mode: retains pack pull-memory behaviour. */
function classicCaptainOptions(owned,rng){
  PACK_NO++;
  const r=rng||Math.random,excl=owned||new Set(),out=[],seen=new Set();
  let guard=0;
  while(out.length<3&&guard++<400){
    const t=r()<0.30?"Icon":"Elite";
    const pool=rosterPoolCards(t,packRosterPool()).filter(p=>!excl.has(p.id)&&!seen.has(p.name));
    if(pool.length){const p=pickPlayer(pool,rng);out.push(p);seen.add(p.name);}
  }
  persistRand();
  return out;
}
/* canonical entry points */
const calculateTeamOVR=teamOVR;
const updateProjectedRecord=projection;

export {DB,teamOVR,chemistry,projection,nearMissChem,eligible};
