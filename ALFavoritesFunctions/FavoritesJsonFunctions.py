import json

with open("user_favourites_data1.json", "r") as myFile:
    data = myFile.read()

fav_obj = json.loads(data)

users_obj = fav_obj["users"]


def findUsersWithFavoritedId(favId, type="manga"):
    userList = []
    for user in users_obj.values():
        username = user["name"]
        relevantFavorites = user["favourites"][type]
        for favorite in relevantFavorites:
            favorite_id = favorite["id"]
            if favorite_id == favId:
                userList.append(username)
                print("Object of found user: ", user)
    return userList


print(findUsersWithFavoritedId(87076))