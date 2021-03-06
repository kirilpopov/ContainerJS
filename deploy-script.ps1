IF ($env:APPVEYOR_REPO_BRANCH -eq "master") {
  Write-Host "Publishing docs to gh-pages"
  git config --global credential.helper store
  Add-Content "$env:USERPROFILE\.git-credentials" "https://$($env:access_token):x-oauth-basic@github.com`n"
  git config --global user.email $env:github_email
  git config --global user.name "ColinEberhardt"
  git add .
  git commit -m "Update gh-pages: $env:APPVEYOR_REPO_COMMIT_MESSAGE"
  git subtree split --prefix docs -b gh-pages
  git push -f origin gh-pages:gh-pages
}
Else {
  Write-Host "Not on branch 'master', not publishing docs"
}

exit
