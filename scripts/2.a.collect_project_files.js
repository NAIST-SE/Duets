const async = require("async");
const fs = require("fs");
const path = require("path");
const ProgressBar = require("progress");

const utils = require("./utils");
const config = require("./config");

if (!fs.existsSync(config.output)) {
  fs.mkdirSync(config.output);
}

const tokens = {};
for (let token of config.github_tokens) {
  tokens[token] = {};
}

const fileContent = fs
  .readFileSync(__dirname + "/../java_repos.txt")
  .toString();
const repos = fileContent.split("\n");

var bar = new ProgressBar("[:bar] :current :rate/bps :percent :etas :step", {
  complete: "=",
  incomplete: " ",
  width: 30,
  total: repos.length,
});

const available_tokens = [...config.github_tokens];

async.eachOfLimit(
  utils.shuffle(repos),
  available_tokens.length,
  (item, index, callback) => {
    bar.tick({
      step: item,
    });
    const files_path = path.join(OUTPUT_dir, item, "project-files.json");
    if (fs.existsSync(files_path)) {
      return callback();
    }
    const token = available_tokens.pop();
    const octokit = utils.createOctokit(token)

    const owner = item.split("/")[0];
    const repo = item.split("/")[1];
    const tree_sha = "HEAD";
    const recursive = 1;

    octokit.git
      .getTree({
        owner,
        repo,
        tree_sha,
        recursive,
      })
      .then(
        (response) => {
          if (!fs.existsSync(OUTPUT_dir + owner)) {
            fs.mkdirSync(OUTPUT_dir + owner);
          }
          const files = response.data;
          for (let file of files.tree) {
            delete file.url;
          }
          fs.writeFile(files_path, JSON.stringify(files), (err) => {
            available_tokens.push(token);
            if (err) {
              console.error(err);
            }
            callback();
          });
        },
        (err) => {
          console.error(err.message, owner, repo);
          available_tokens.push(token);
          callback();
        }
      );
  }
);
