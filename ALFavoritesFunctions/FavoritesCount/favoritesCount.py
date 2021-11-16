import requests
import json

favorites_query = """
query($name: String){
User(name:$name){id, name,
  favourites{
    
    characters1:characters(page:1){
      nodes{
        id
        name {
          full
          first
          last
        }
      }
    }
        characters2:characters(page:2){
      nodes{
        id
        name {
          full
          first
          last
        }
      }
    }
    characters3:characters(page:3){
      nodes{
        id
        name {
          full
          first
          last
        }
      }
    }
    characters4:characters(page:4){
      nodes{
        id
        name {
          full
          first
          last
        }
      }
    }
		anime1:anime(page:1){
			nodes{
        type
				id
        idMal
        title{
          romaji
        }
            }
		}
		anime2:anime(page:2){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
		}
		anime3:anime(page:3){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
		}
		anime4:anime(page:4){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
        }
        manga1:manga(page:1){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
		}
		manga2:manga(page:2){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
		}
		manga3:manga(page:3){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
		}
		manga4:manga(page:4){
			nodes{
				id
        idMal
        type
        title{
          romaji
        }
			}
    }
  }
}
}
"""

url = "https://graphql.anilist.co"

userList = ["zenmodeman", "Mole"]


def getAPIResponse(query, variablesObj):
    # print(variablesObj)
    response = requests.post(url, json={"query": query, "variables": variablesObj})
    respJson = response.json()
    return respJson


def getTopObject(placement):
    return {
        "top1": 1 if placement <= 1 else 0,
        "top3": 1 if placement <= 3 else 0,
        "top5": 1 if placement <= 5 else 0,
        "top10": 1 if placement <= 10 else 0,
        "top25": 1 if placement <= 25 else 0,
        "total": 1,
    }


# Gets an id with an anime/manga suffix prioritizing the mal id for generic purposes
# assumes that the node has key type
def getFavNodeId(favNode):
    malId = favNode.get("idMal", None)
    alId = favNode["id"]
    type = favNode.get("type", "UNKNOWN_TYPE")
    leadingChar = type[0]
    workingId = malId if malId else alId
    favNodeId = str(workingId) + leadingChar
    favNode["primaryId"] = favNodeId
    return favNodeId


def addFavNodeToObj(favNode, obj, username, placement=1):
    favNodeId = getFavNodeId(favNode)
    # topObj = getTopObject(placement)
    userPlacements = {username: placement}
    obj[favNodeId] = {**favNode, "userPlacements": userPlacements}


# Top data related code
# topObj = getTopObject(placement)

# for k, v in topObj.items():
#     obj[nodeId][k] += v


def updateFavNodeForObj(favNode, obj, username, placement=1):
    favNodeId = getFavNodeId(favNode)
    obj[favNodeId]["userPlacements"][username] = placement


# assumes that the node have key "type"
def processNodeForObj(node, obj, username, placement):
    id = getFavNodeId(node)
    if id not in obj:
        addFavNodeToObj(node, obj, username, placement)
    else:
        updateFavNodeForObj(node, obj, username, placement)


def getFavoritesCountObjects(userList):
    uniqueUserList = list(set(userList))
    animeObj = {}
    mangaObj = {}
    characterObj = {}
    for username in uniqueUserList:
        respJson = getAPIResponse(favorites_query, {"name": username})
        if not respJson:
            continue
        respData = respJson["data"]
        if not respData:
            continue
        respUser = respData["User"]
        if not respUser:
            continue
        userFavorites = respUser["favourites"]
        if not userFavorites:
            continue
        animeFull = []
        animeFull.extend(userFavorites["anime1"]["nodes"])
        animeFull.extend(userFavorites["anime2"]["nodes"])

        animeFull.extend(userFavorites["anime3"]["nodes"])
        animeFull.extend(userFavorites["anime4"]["nodes"])
        # animeCount = len(animangaFull)

        for i, animeNode in enumerate(animeFull):
            processNodeForObj(animeNode, animeObj, username, i + 1)

        mangaFull = []

        mangaFull.extend(userFavorites["manga1"]["nodes"])
        mangaFull.extend(userFavorites["manga2"]["nodes"])
        mangaFull.extend(userFavorites["manga3"]["nodes"])
        mangaFull.extend(userFavorites["manga4"]["nodes"])
        for i, mangaNode in enumerate(mangaFull):
            processNodeForObj(mangaNode, mangaObj, username, i + 1)

        charactersFull = []
        charactersFull.extend(userFavorites["characters1"]["nodes"])
        charactersFull.extend(userFavorites["characters2"]["nodes"])
        charactersFull.extend(userFavorites["characters3"]["nodes"])
        charactersFull.extend(userFavorites["characters4"]["nodes"])
        for i, characterNode in enumerate(charactersFull):
            characterNode["type"] = "CHARACTER"
            processNodeForObj(characterNode, characterObj, username, i + 1)
    return animeObj, mangaObj, characterObj


def get_sorted_arr_from_fav_obj(fav_obj):
    arr = list(fav_obj.values())
    arr.sort(key=lambda x: len(x["userPlacements"]), reverse=True)
    return arr


def get_sorted_data(fav_obj_tuple):
    # animeObj, mangaObj, characterObj = getFavoritesCountObjects(arr)
    animeObj, mangaObj, characterObj = fav_obj_tuple
    animeArr = get_sorted_arr_from_fav_obj(animeObj)
    mangaArr = get_sorted_arr_from_fav_obj(mangaObj)
    characterArr = get_sorted_arr_from_fav_obj(characterObj)
    return animeArr, mangaArr, characterArr


def write_sorted_data(fav_obj_tuple, identifier="ALFavoritesSorted"):
    animeArr, mangaArr, characterArr = get_sorted_data(fav_obj_tuple)
    animeFilename = identifier + "_anime.json"
    mangaFilename = identifier + "_manga.json"
    characterFilename = identifier + "_character.json"
    print("Writing to files")
    with open(animeFilename, "w") as af:
        json.dump(animeArr, af)
    with open(mangaFilename, "w") as mf:
        json.dump(mangaArr, mf)
    with open(characterFilename, "w") as cf:
        json.dump(characterArr, cf)
    print("Finished writing to file")


def write_fav_json(fav_obj_tuple, filename="ALFavorites.json"):
    animeObj, mangaObj, characterObj = fav_obj_tuple
    finalObj = {"anime": animeObj, "manga": mangaObj, "characters": characterObj}
    print("Writing final object to file named: ", filename)
    with open(filename, "w") as f:
        json.dump(finalObj, f)
    print("File written")


# print(getData(["zenmodeman", "Mienus", "Mole"]))


def get_array_from_text_file(filename):
    arr = []
    with open(filename, "r") as f:
        for line in f.readlines():
            line = line.strip()
            arr.append(line)
    return arr


if __name__ == "__main__":
    arr = get_array_from_text_file("ComfyCampALUsernames.txt")
    fav_obj_tuple = getFavoritesCountObjects(arr)
    print(fav_obj_tuple)
    write_sorted_data(fav_obj_tuple, "ComfyCampALFavoritesSorted")
    write_fav_json(fav_obj_tuple, "ComfyCampAL.json")
