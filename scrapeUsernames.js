const fs = require("fs");

const fetch = require("isomorphic-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

//CGDCT club
const clubLink1 =
  "https://myanimelist.net/clubs.php?action=view&t=members&id=27093";
//Comfy Camp club
const clubLink2 =
  "https://myanimelist.net/clubs.php?id=75493&action=view&t=members";

function getNumPages(clubDom) {
  const selection =
    clubDom.window.document.querySelector(".borderClass").textContent;
  const pagesAndBeyond = selection.substring(selection.indexOf("Pages"));
  const regExp = /\(([^)]+)\)/;
  const numPages = parseInt(regExp.exec(pagesAndBeyond)[1]);
  return numPages;
}

function getUserNamesArr(clubDom) {
  const selections = clubDom.window.document.querySelectorAll(
    "td.borderClass div a"
  );
  const userArr = [];
  selections.forEach(function (selection) {
    const text = selection.textContent;
    //if check to clean out empty string acquisitions
    if (text) {
      userArr.push(text);
    }
  });
  return userArr;
}
async function getDomFromLink(clubLink) {
  const response = await fetch(clubLink);
  const text = await response.text();
  const dom = new JSDOM(text);
  return dom;
}
async function fetchNames(clubLinks, storageFileName = "ComfyCampUsers.txt") {
  const totalUsersSet = new Set();

  for (const clubLink of clubLinks) {
    const dom = await getDomFromLink(clubLink);
    const numPages = getNumPages(dom);
    for (let i = 0; i < numPages; i++) {
      const textToAdd = `&show=${36 * i}`;
      const currentLink = clubLink + textToAdd;
      console.log(currentLink);
      const currentDom = await getDomFromLink(currentLink);
      const currArr = getUserNamesArr(currentDom);
      for (const username of currArr) {
        if (!totalUsersSet.has(username)) {
          totalUsersSet.add(username);
        }
      }
    }
  }
  const totalUserArr = [...totalUsersSet];
  console.log("writing to file");
  for (let i = 0; i < totalUserArr.length; i++) {
    if (i == 0) {
      fs.writeFileSync(storageFileName, `${totalUserArr[i]}\n`, { flag: "w" });
    } else if (i == totalUserArr.length - 1) {
      fs.writeFileSync(storageFileName, `${totalUserArr[i]}`, {
        flag: "a",
      });
    } else {
      fs.writeFileSync(storageFileName, `${totalUserArr[i]}\n`, { flag: "a" });
    }
  }
  console.log("Done writing to file");
}
const clubLinks = [clubLink2];
fetchNames(clubLinks);
