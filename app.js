async function loadSongs() {
  const response = await fetch('/api/songs');
  const songs = await response.json();
  console.log(songs);
}

loadSongs();
