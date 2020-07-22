/*
adaptAggregationToUser takes an old data form used for aggregation
 and transforms it to a new data form

 It is no longer needed but is featured here for reference sake
*/
function adaptAggregationToUser(aggregationFormUserData) {
  const titleList = Object.keys(aggregationFormUserData)
  console.log(titleList)
  const userArr = []
  let userName = null
  for (const title of titleList) {
    console.log(title)
    const data = aggregationFormUserData[title]
    console.log(data)
    const { users } = data
    console.log(users)
    if (userName === null) userName = Object.keys(users)[0]
    userArr.push({ title, score: users[userName] })
  }
  return { [userName]: userArr }
}
