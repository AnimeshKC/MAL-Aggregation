import json
from time import time, sleep
from urllib.request import urlopen
from urllib.error import HTTPError
import requests


def getFavoritesUrl(username):
    leading_url = "https://api.jikan.moe/v4/users/"
    trailing_url = "/favorites"
    return leading_url + username + trailing_url


def getUserFavorites(username):
    resp = requests.get(getFavoritesUrl(username))
    respJson = resp.json()
    return respJson


def getFavoritesCountObjects(userList):
    uniqueUserList = list(set(userList))


getUserFavorites("zenmodeman")