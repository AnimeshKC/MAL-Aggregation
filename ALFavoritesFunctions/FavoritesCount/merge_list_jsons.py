import json

from favoritesCount import write_obj_to_file


def get_al_full_name(mal_name):
    split_arr = [name.strip() for name in mal_name.split(",")]
    first_last_arr = split_arr[::-1]
    al_full_name = " ".join(first_last_arr)
    return al_full_name


# modify MAL json to have full name
def modify_mal_json(mal_json):
    mal_characters = mal_json["characters"]
    for character_id in mal_characters:
        character_obj = mal_characters[character_id]
        character_name = character_obj["name"]
        al_full = get_al_full_name(character_name)
        character_obj["full"] = al_full
        # print(mal_json["characters"])
        break


def merge_by_id(user_placement_json1, user_placement_json2):

    for user_placement_obj2_id, user_placement_obj2 in user_placement_json2.items():
        # merge the userPlacements information
        # In the case of duplicate username keys within userPlacements, the second object wins out
        if user_placement_obj2_id in user_placement_json1:
            json1_placements = user_placement_json1[user_placement_obj2_id][
                "userPlacements"
            ]
            json2_placements = user_placement_obj2["userPlacements"]

            user_placement_json1[user_placement_obj2_id]["userPlacements"] = {
                **json1_placements,
                **json2_placements,
            }
        else:
            user_placement_json1[user_placement_obj2_id] = user_placement_obj2

    return user_placement_json1


def merge_list_jsons(al_json_file, mal_json_file):
    with open(al_json_file) as a:
        al_json = json.load(a)
    with open(mal_json_file) as m:
        mal_json = json.load(m)
    print(len(al_json["anime"]))
    print(len(mal_json["anime"]))
    modify_mal_json(mal_json)
    al_json_anime = al_json["anime"]
    al_json_manga = al_json["manga"]

    mal_json_anime = mal_json["anime"]
    mal_json_manga = mal_json["manga"]

    json_anime_combined = merge_by_id(mal_json_anime, al_json_anime)
    json_manga_combined = merge_by_id(mal_json_manga, al_json_manga)

    mal_json_characters = mal_json["characters"]
    mal_json_characters = {
        get_al_full_name(obj["name"]): obj for obj in mal_json_characters.values()
    }
    al_json_characters = al_json["characters"]
    al_json_characters = {
        obj["name"]["full"]: obj for obj in al_json_characters.values()
    }

    json_characters_combined = merge_by_id(mal_json_characters, al_json_characters)

    return {
        "anime": json_anime_combined,
        "manga": json_manga_combined,
        "characters": json_characters_combined,
    }


merged_obj = merge_list_jsons("ComfyCampAL.json", "ComfyCampMAL.json")

write_obj_to_file(merged_obj, "ComfyCampCombined.json")