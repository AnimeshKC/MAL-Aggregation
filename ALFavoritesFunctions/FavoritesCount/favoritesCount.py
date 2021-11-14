import requests

favorites_query = """
query($name: String){
User(name:$name){id, name,
  favourites{
    
    characters1:characters(page:1){
      nodes{
        id
        name {
          full
        }
      }
    }
        characters2:characters(page:2){
      nodes{
        id
        name {
          full
        }
      }
    }
    characters3:characters(page:3){
      nodes{
        id
        name {
          full
        }
      }
    }
    characters4:characters(page:3){
      nodes{
        id
        name {
          full
        }
      }
    }
		anime1:anime(page:1){
			nodes{
        type
				id
        title{
          romaji
        }
            }
		}
		anime2:anime(page:2){
			nodes{
				id
        type
        title{
          romaji
        }
			}
		}
		anime3:anime(page:3){
			nodes{
				id
        type
        title{
          romaji
        }
			}
		}
		anime4:anime(page:4){
			nodes{
				id
        type
        title{
          romaji
        }
			}
        }
        manga1:manga(page:1){
			nodes{
				id
        type
        title{
          romaji
        }
			}
		}
		manga2:manga(page:2){
			nodes{
				id
        type
        title{
          romaji
        }
			}
		}
		manga3:manga(page:3){
			nodes{
				id
        type
        title{
          romaji
        }
			}
		}
		manga4:manga(page:4){
			nodes{
				id
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


def addFavNodeToObj(favNode, obj, username, placement=1):
    favNodeId = favNode["id"]
    topObj = getTopObject(placement)
    userSet = set([username])
    obj[favNodeId] = {**favNode, **topObj, "userSet": userSet}


def updateFavNodeIdForObj(nodeId, obj, username, placement=1):
    # print(nodeId)
    topObj = getTopObject(placement)
    # print(topObj)

    for k, v in topObj.items():
        # print(k)
        # print(v)
        # print(obj)
        # print(obj)
        # print(nodeId)
        obj[nodeId][k] += v
    obj[nodeId]["userSet"].add(username)


def processNodeForObj(node, obj, username, placement):
    id = node["id"]
    if id not in obj:
        addFavNodeToObj(node, obj, username, placement)
    else:
        updateFavNodeIdForObj(id, obj, username, placement)


def getFavoritesCountObjects(userList):
    uniqueUserList = list(set(userList))
    animangaObj = {}
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
        animangaFull = []
        animangaFull.extend(userFavorites["anime1"]["nodes"])
        animangaFull.extend(userFavorites["anime2"]["nodes"])

        animangaFull.extend(userFavorites["anime3"]["nodes"])
        animangaFull.extend(userFavorites["anime4"]["nodes"])
        animangaFull.extend(userFavorites["manga1"]["nodes"])
        animangaFull.extend(userFavorites["manga2"]["nodes"])
        animangaFull.extend(userFavorites["manga3"]["nodes"])
        animangaFull.extend(userFavorites["manga4"]["nodes"])

        for i, animangaNode in enumerate(animangaFull):
            processNodeForObj(animangaNode, animangaObj, username, i + 1)
        charactersFull = []
        charactersFull.extend(userFavorites["characters1"]["nodes"])
        charactersFull.extend(userFavorites["characters2"]["nodes"])
        charactersFull.extend(userFavorites["characters3"]["nodes"])
        charactersFull.extend(userFavorites["characters4"]["nodes"])
        for i, characterNode in enumerate(charactersFull):
            processNodeForObj(characterNode, characterObj, username, i + 1)
    return animangaObj, characterObj


print(getFavoritesCountObjects(["zenmodeman", "Mienus", "Mole"]))