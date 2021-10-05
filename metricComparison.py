data_arr = []
with open("ratios.txt") as file:
    lines = file.readlines()
    for line in lines:
        # number. name percentage (44/156)
        split_arr = line.split()
        name = split_arr[1]
        count_str = split_arr[3]
        top_seen, num_seen = count_str.replace("(", "").replace(")", "").split("/")
        data_arr.append(
            {"name": name, "top_seen": int(top_seen), "num_seen": int(num_seen)}
        )


def zen_metric(data_arr):
    ratio_arr = []
    for user in data_arr:
        top_seen = user["top_seen"]
        num_seen = user["num_seen"]
        name = user["name"]
        ratio = (top_seen * top_seen) / (100 * num_seen)
        ratio_arr.append(
            {
                "name": name,
                "top_seen": int(top_seen),
                "num_seen": int(num_seen),
                "zen_ratio": ratio,
            }
        )
    sorted_ratio_arr = sorted(ratio_arr, key=lambda x: x["zen_ratio"], reverse=True)
    for i in range(len(sorted_ratio_arr)):
        pos = i + 1
        name = sorted_ratio_arr[i]["name"]
        top_seen = sorted_ratio_arr[i]["top_seen"]
        num_seen = sorted_ratio_arr[i]["num_seen"]
        zen_ratio = sorted_ratio_arr[i]["zen_ratio"]
        print(f"{pos}. {name} {zen_ratio} ({top_seen}/{num_seen})")


zen_metric(data_arr)