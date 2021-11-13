import requests

query = """query($name: String)
{
  User(name: $name){
    id
  }
}
"""

url = "https://graphql.anilist.co"


userSet = {
    "Natsuyasumi",
    "SaltyTiger",
    "Bulldog3321",
    "Arielfebr",
    "FubukiKai",
    "rentaidesu",
    "kyoukaya",
    "snootie",
    "LordZounds",
    "Danes",
    "Moka",
    "p0n380y",
    "BlitzWar1o",
    "puppeht",
    "Femton",
    "Mofuji",
    "chibifuu",
    "Celysus",
    "clpstar2",
    "zoopyloopy",
    "mekky",
    "sc547",
    "Rikka",
    "QLUM",
    "jeoxy",
    "QWER47REWQ",
    "LisbonFragment",
    "Ephemeris",
    "YukariChan",
    "shiten",
    "Sayakasquared",
    "Isorn",
    "PorcoBarrao",
    "Agnamut",
    "tsuk13",
    "teedeeaye",
    "Wuna",
    "cardemonde",
    "nihoshi",
    "Hildegarde",
    "A3on",
    "DennyNiichama",
    "sbjdo",
    "BayCA",
    "Karararama",
    "saaaahil",
    "YakumiAmagiri",
    "Utopianray",
    "FoolyMetalFooly",
    "Koybz",
    "shinobanana",
    "Zura",
    "lillja",
    "LealSnake",
    "SuperSonic16",
    "scarletmikasa",
    "commonsensei",
    "Rangerstown",
    "phantomyeet",
    "HackGuy",
    "Curry",
    "Mahvelous21",
    "grain",
    "SuccubusGF",
    "Walid",
    "Minaze",
    "mw2",
    "YACQIE",
    "limnakama",
    "gerg",
    "punchingspagetti",
    "minhpro279",
    "Mika",
    "ShadowOfTheNight",
    "yeobo",
    "Tenkun",
    "Ryouko",
    "saigyo",
    "NoodleCasino",
    "Mikumo14",
    "DelightfulDelirium",
    "DjDrake8",
    "Urqji",
    "AnimeRose93",
    "Phantom368",
    "Kagamin",
    "Jadelynn",
    "Vinsuchi",
    "crawfish",
    "Egguca",
    "LuxFAV",
    "user32531",
    "FPANI",
    "char00t",
    "Otalora",
    "T1",
    "foxyfeint",
    "holzblock",
}

idList = []
for username in userSet:
    response = requests.post(
        url, json={"query": query, "variables": {"name": username}}
    )

    respJson = response.json()
    if respJson and respJson["data"] and respJson["data"]["User"]:
        id = respJson["data"]["User"]["id"]
        idList.append(id)

print(idList)