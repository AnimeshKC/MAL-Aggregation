import json
from time import time, sleep
from urllib.request import urlopen
from urllib.error import HTTPError
import requests

from favoritesCount import (
    write_sorted_data,
    get_array_from_text_file,
    write_fav_tuple_to_file,
)


def getFavoritesUrl(username):
    leading_url = "https://api.jikan.moe/v4/users/"
    trailing_url = "/favorites"
    return leading_url + username + trailing_url


def getUserFavorites(username):
    resp = requests.get(getFavoritesUrl(username))
    respJson = resp.json()
    return respJson


# should not be modifying key in a get function
def get_fav_node_id(fav_node):
    mal_id = fav_node["mal_id"]
    type = fav_node.get("type", "UNKNOWN_TYPE")
    leading_char = type[0]
    fav_node_id = str(mal_id) + leading_char
    return fav_node_id


# transform_type should be "anime", "manga", or "character"
def get_transformed_fav_node(fav_node, transform_type="anime"):
    desired_keys = ["mal_id"]
    if transform_type.lower() in ["anime", "manga"]:
        desired_keys.append("title")
    elif transform_type in ["character"]:
        desired_keys.append("name")
    # print(fav_node)
    transformed_fav_node = {
        desired_key: fav_node[desired_key] for desired_key in desired_keys
    }
    transformed_fav_node["type"] = transform_type.upper()

    fav_node_id = get_fav_node_id(transformed_fav_node)
    transformed_fav_node["primaryId"] = fav_node_id
    return transformed_fav_node


def add_fav_node_to_obj(fav_node, fav_obj, username, placement):
    # transformed_node = get_transformed_fav_node(fav_node)
    fav_node_id = get_fav_node_id(fav_node)
    user_placements = {username: placement}
    fav_obj[fav_node_id] = {**fav_node, "userPlacements": user_placements}


def update_fav_node_for_obj(fav_node, fav_obj, username, placement):
    fav_node_id = get_fav_node_id(fav_node)
    fav_obj[fav_node_id]["userPlacements"][username] = placement


def process_node_for_obj(fav_node, fav_obj, username, placement):
    id = get_fav_node_id(fav_node)
    if id not in fav_obj:
        add_fav_node_to_obj(fav_node, fav_obj, username, placement)
    else:
        update_fav_node_for_obj(fav_node, fav_obj, username, placement)


def getFavoritesCountObjects(userList):
    uniqueUserList = list(set(userList))
    unobtainableUsers = []
    anime_obj = {}
    manga_obj = {}
    character_obj = {}
    for username in uniqueUserList:
        userJson = getUserFavorites(username)
        # print(userJson)
        if "status" in userJson and userJson["status"] >= 400:
            unobtainableUsers.append(username)
            continue
        userData = userJson["data"]
        userAnimeFavorites = userData["anime"]
        for i, animeNode in enumerate(userAnimeFavorites):
            transformed_anime_node = get_transformed_fav_node(animeNode, "anime")
            process_node_for_obj(transformed_anime_node, anime_obj, username, i + 1)
        userMangaFavorites = userData["manga"]
        for i, mangaNode in enumerate(userMangaFavorites):
            transformed_manga_node = get_transformed_fav_node(mangaNode, "manga")
            process_node_for_obj(transformed_manga_node, manga_obj, username, i + 1)
        userCharacterFavorites = userData["characters"]
        for i, characterNode in enumerate(userCharacterFavorites):
            transformed_character_node = get_transformed_fav_node(
                characterNode, "character"
            )
            process_node_for_obj(
                transformed_character_node, character_obj, username, i + 1
            )
        print("Need to sleep before the next request for 2s")
        sleep(2)
    return anime_obj, manga_obj, character_obj


if __name__ == "__main__":
    # getUserFavorites("zenmodeman")
    arr = get_array_from_text_file("ComfyCampMALUsernames.txt")
    fav_tuple = getFavoritesCountObjects(arr[0:40])
    # print(fav_tuple)
    write_fav_tuple_to_file(fav_tuple, "ComfyCampMAL.json")
    # write_sorted_data(fav_tuple, "ComfyCampMALFavoritesSorted")