# arcade-stacker

Static Stacker arcade game.

## Hosting at `my-domain.com/stacker`

Upload the contents of this folder to a `stacker` directory on your web host:

```text
public_html/
  stacker/
    index.html
    styles.css
    game.js
```

Then the game will open at:

```text
https://my-domain.com/stacker/
```

The page uses relative links:

```html
<link rel="stylesheet" href="styles.css">
<script src="game.js"></script>
```

So it works from `/stacker/` without changing the code.
