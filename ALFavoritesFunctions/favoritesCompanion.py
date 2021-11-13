import requests

# Here we define our query as a multi-line string
query = """
query (
	  $mediaId: Int,
	  $page: Int
	) {
	  Page (page: $page) {
	    mediaList (mediaId: $mediaId, sort: SCORE_DESC) {
	     status 
       score
	      user {
		name
  		favourites {
		  anime {
		    nodes {
		      id
          title{
            romaji
          }
		    }
		  }
		  manga {
		    nodes {
		      id
        title{
          romaji
        }
		    }
		  }
		}
	      }
	    }
	  }
	}
"""

# idToCheck = 75353

# Define our query variables and values that will be used in the query request
# variables = {"mediaId": idToCheck, "page": 10000}

url = "https://graphql.anilist.co"

# Make the HTTP Api request
# response = requests.post(url, json={"query": query, "variables": variables})
# print("new hello")

# respJson = response.json()
# respMediaList = respJson["data"]["Page"]["mediaList"]

# print(len(respMediaList))

# userList1 = []
# type = "anime"
# for respObj in respMediaList:

#     # print(respObj)
#     user = respObj["user"]
#     userFavorites = user["favourites"]
#     favoritesNodes = userFavorites[type]["nodes"]
#     # print(favoritesNodes)
#     for node in favoritesNodes:
#         # print(node)
#         if node["id"] == idToCheck:
#             userList1.append(user["name"])
#     print(user["name"])
# print(userList1)

primaryWork = {"tag": "Yuyushiki", "ids": [15911, 75353, 98344], "userSet": set()}

companionWorks = [
    {"tag": "Azumanga Daioh", "ids": [66, 30085], "userSet": set()},
    {"tag": "Yotsuba", "ids": [30104], "userSet": set()},
]


def modifyUserSets(primaryWork, companionWorks):
    # Create a mapping of the indices corresponding to an id
    # This is for efficiency purposes so that we can check whether an anime or manga id is relevant
    companionMap = {}
    for i in range(len(companionWorks)):
        for id in companionWorks[i]["ids"]:
            companionMap[id] = i

    # Iterate for all of the ids corresponding to the primary query
    for primaryId in primaryWork["ids"]:
        print("Starting with primaryId: ", primaryId)
        pageNum = 1
        # A while loop that is supposed to keep going until there is no remaining page data
        while True:
            print("On Page Number: ", pageNum)

            variables = {"mediaId": primaryId, "page": pageNum}

            # Get the reveleant mediaList data
            response = requests.post(url, json={"query": query, "variables": variables})
            respJson = response.json()
            respMediaList = respJson["data"]["Page"]["mediaList"]
            print("Response received for Page Num: ", pageNum)
            print("Response size is: ", len(respMediaList))
            if len(respMediaList) == 0:
                break

            print("Starting getting users for the page")
            # Iterate through all the objects in the media list, each of which corresponds to one user
            for respObj in respMediaList:

                # Variable to track whether the primary id is found in favorites
                # If it isn't found, the companion sets are not updated
                primaryFound = False
                user = respObj["user"]
                if not user:
                    continue
                username = user["name"]

                # Keep a list that signifies whether a user can be added to any of the companion works
                additions = [False] * len(companionWorks)

                # get all the relevant favorites nodes
                userFavorites = user["favourites"]
                nodes = []
                nodes.extend(userFavorites["anime"]["nodes"])
                nodes.extend(userFavorites["manga"]["nodes"])

                for node in nodes:
                    currId = node["id"]
                    # If the primary is found, set the boolean to true and add to the user set
                    if currId == primaryId:
                        primaryFound = True
                        primaryWork["userSet"].add(username)
                    if currId in companionMap:
                        additions[companionMap[currId]] = True
                # Add companions if the primary was found
                if primaryFound == True:
                    for i in range(len(additions)):
                        # if the addition index has a true value, add to the corresponding index of the companion set
                        if additions[i] == True:
                            companionWorks[i]["userSet"].add(username)
            print("Moving onto the next page")
            # move to the next page
            pageNum += 1


hyougeObj = {"tag": "Hyouge Mono", "ids": [35380], "userSet": set()}

# Dict of structure "id": {"title", "userSet": set()}
companionDict = {}

limitedObj = {"tag": "Yuyushiki", "ids": [75353], "userSet": set()}


def PushCompanion(primaryWork, companionDict):
    # Iterate for all of the ids corresponding to the primary query
    for primaryId in primaryWork["ids"]:
        print("Starting with primaryId: ", primaryId)
        pageNum = 1
        # A while loop that is supposed to keep going until there is no remaining page data
        while True:
            print("On Page Number: ", pageNum)

            variables = {"mediaId": primaryId, "page": pageNum}

            # Get the reveleant mediaList data
            response = requests.post(url, json={"query": query, "variables": variables})
            respJson = response.json()
            respMediaList = respJson["data"]["Page"]["mediaList"]
            print("Response received for Page Num: ", pageNum)
            print("Response size is: ", len(respMediaList))
            if len(respMediaList) == 0:
                break

            print("Starting getting users for the page")
            # Iterate through all the objects in the media list, each of which corresponds to one user
            for respObj in respMediaList:
                if respObj["status"] == "PLANNING":
                    continue
                primaryFound = False
                user = respObj["user"]
                if not user:
                    continue
                username = user["name"]

                userFavorites = user["favourites"]
                nodes = []
                nodes.extend(userFavorites["anime"]["nodes"])
                nodes.extend(userFavorites["manga"]["nodes"])
                tempCompanionDict = {}
                for node in nodes:
                    currId = node["id"]
                    if currId == primaryId:
                        primaryFound = True
                        primaryWork["userSet"].add(username)
                    elif currId not in primaryWork["ids"]:
                        tempCompanionDict[currId] = node["title"]["romaji"]
                if primaryFound == True:
                    for tempId in tempCompanionDict.keys():
                        if tempId in companionDict:
                            companionDict[tempId]["userSet"].add(username)
                        else:
                            companionDict[tempId] = {
                                "title": tempCompanionDict[tempId],
                                "userSet": set([username]),
                            }
            print("Moving onto the next page")
            # move to the next page
            pageNum += 1


priparaObj = {
    "tag": "Pripara",
    "ids": [20742, 20985, 21559, 98107, 101097, 20917, 21453, 103740, 107755],
    "userSet": set(),
}
tearmoonObj = {"tag": "Tearmoon Empire", "ids": [113399], "userSet": set()}
gltObj = {"tag": "Girls' Last Tour", "ids": [99420, 85412], "userSet": set()}
yuruCampObj = {
    "tag": "Yuru Camp",
    "ids": [98351],
    # "ids": [98444, 104460, 98351, 101206, 104461, 104459],
    "userSet": set(),
}

aiuraObj = {
    "tag": "Aiura",
    "ids": [75980],
    # "ids": [98444, 104460, 98351, 101206, 104461, 104459],
    "userSet": set(),
}
ergoProxyObj = {
    "tag": "Ergo Proxy",
    "ids": [790],
    # "ids": [98444, 104460, 98351, 101206, 104461, 104459],
    "userSet": set(),
}
konMangaObj = {
    "tag": "K-on",
    "ids": [43001],
    # "ids": [98444, 104460, 98351, 101206, 104461, 104459],
    "userSet": set(),
}

mnmObj = {
    "tag": "Mai no Mushigurashi",
    "ids": [107478],
    "userSet": set(),
}
print("Calling function")

PushCompanion(mnmObj, companionDict)

print("Finished calling function")

print(mnmObj)

print("The number of members in the primary object is: ", len(mnmObj["userSet"]))
countArr = []
for id in companionDict:
    userSet = companionDict[id]["userSet"]
    title = companionDict[id]["title"]
    count = len(userSet)
    countArr.append({"title": title, "count": count, "id": id})
countArr.sort(key=lambda obj: obj["count"], reverse=True)


print(countArr)