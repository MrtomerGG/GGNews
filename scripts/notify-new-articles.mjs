import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { load as parseYaml } from 'js-yaml';

const ARTICLE_ROOT = 'src/content/articles/';
const NOTIFICATION_SETTINGS_PATH = 'src/data/notifications.json';
const APP_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const ZERO_SHA_PATTERN = /^0+$/;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function readFileAtRevision(revision, filePath) {
  if (!revision || ZERO_SHA_PATTERN.test(revision)) return null;

  try {
    return execFileSync('git', ['show', `${revision}:${filePath}`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function parseArticle(source, filePath = 'article.md') {
  const match = source?.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`No YAML frontmatter found in ${filePath}.`);

  const data = parseYaml(match[1]);
  if (!data || typeof data !== 'object') throw new Error(`Invalid YAML frontmatter in ${filePath}.`);

  return {
    title: typeof data.title === 'string' ? data.title.trim() : '',
    excerpt: typeof data.excerpt === 'string' ? data.excerpt.trim() : '',
    cover: typeof data.cover === 'string' ? data.cover.trim() : '',
    draft: data.draft === true,
  };
}

function getChangedArticlePaths(beforeRevision, afterRevision) {
  const args = beforeRevision && !ZERO_SHA_PATTERN.test(beforeRevision)
    ? ['diff', '--name-only', '--diff-filter=AM', beforeRevision, afterRevision, '--', ARTICLE_ROOT]
    : ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', afterRevision, '--', ARTICLE_ROOT];

  return execFileSync('git', args, { encoding: 'utf8' })
    .split(/\r?\n/)
    .map((filePath) => filePath.trim())
    .filter((filePath) => filePath.startsWith(ARTICLE_ROOT) && filePath.endsWith('.md'));
}

function articleUrl(siteUrl, filePath) {
  const articleId = filePath
    .slice(ARTICLE_ROOT.length, -3)
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  return new URL(`/articles/${articleId}/`, `${siteUrl}/`).href;
}

function stableUuid(value) {
  const bytes = createHash('sha256').update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function absoluteAssetUrl(siteUrl, assetPath) {
  if (!assetPath) return undefined;

  try {
    return new URL(assetPath, `${siteUrl}/`).href;
  } catch {
    return undefined;
  }
}

function becamePublic(currentArticle, previousArticle) {
  return !currentArticle.draft && (!previousArticle || previousArticle.draft);
}

async function waitForPublishedPage(url) {
  const attempts = Number.parseInt(process.env.DEPLOY_POLL_ATTEMPTS || '30', 10);
  const interval = Number.parseInt(process.env.DEPLOY_POLL_INTERVAL_MS || '10000', 10);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'user-agent': 'GGNEWS publication notifier' },
      });

      if (response.ok) {
        console.log(`Published page is ready: ${url}`);
        return;
      }
    } catch (error) {
      console.log(`Deployment check ${attempt}/${attempts} could not reach the site: ${error.message}`);
    }

    if (attempt < attempts) {
      console.log(`Waiting for Cloudflare deployment (${attempt}/${attempts})…`);
      await sleep(interval);
    }
  }

  throw new Error(`The published article did not become available at ${url}. Notification was not sent.`);
}

async function sendNotification({ appId, apiKey, article, url, filePath, afterRevision, siteUrl }) {
  const publicationKey = `${afterRevision}:${filePath}`;
  const iconUrl = new URL('/assets/brand/ggnews-crest-cropped.png', `${siteUrl}/`).href;
  const coverUrl = absoluteAssetUrl(siteUrl, article.cover);
  const message = article.excerpt || article.title;
  const body = {
    app_id: appId,
    target_channel: 'push',
    included_segments: ['Subscribed Users'],
    headings: {
      en: article.title.slice(0, 100),
      he: article.title.slice(0, 100),
    },
    contents: {
      en: message.slice(0, 190),
      he: message.slice(0, 190),
    },
    name: `GGNEWS: ${article.title}`.slice(0, 128),
    url,
    web_url: url,
    chrome_web_icon: iconUrl,
    firefox_icon: iconUrl,
    web_push_topic: `ggnews-${createHash('sha256').update(publicationKey).digest('hex').slice(0, 32)}`,
    idempotency_key: stableUuid(publicationKey),
    ttl: 604800,
  };

  if (coverUrl) body.chrome_web_image = coverUrl;

  const response = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  let responseBody;

  try {
    responseBody = JSON.parse(responseText);
  } catch {
    responseBody = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(`OneSignal rejected the notification (${response.status}): ${JSON.stringify(responseBody)}`);
  }

  if (responseBody.id) {
    console.log(`Notification sent for “${article.title}” (message ${responseBody.id}).`);
  } else {
    console.log(`OneSignal accepted “${article.title}”, but there are no subscribed devices yet.`);
  }
}

function runSelfTest() {
  const draft = parseArticle('---\ntitle: "בדיקה: GGNEWS"\nexcerpt: טקסט\ndraft: true\n---\n');
  const published = parseArticle('---\ntitle: בדיקה\nexcerpt: טקסט\ndraft: false\ncover: /image.jpg\n---\n');

  assert.equal(draft.title, 'בדיקה: GGNEWS');
  assert.equal(draft.draft, true);
  assert.equal(published.draft, false);
  assert.equal(published.cover, '/image.jpg');
  assert.equal(becamePublic(published, draft), true);
  assert.equal(becamePublic(published, published), false);
  assert.equal(becamePublic(draft, null), false);
  assert.match(stableUuid('test'), /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
  assert.equal(articleUrl('https://ggnews.club', `${ARTICLE_ROOT}hello-world.md`), 'https://ggnews.club/articles/hello-world/');
  console.log('Notification script self-test passed.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    runSelfTest();
    return;
  }

  if (process.env.GITHUB_REF && process.env.GITHUB_REF !== 'refs/heads/main') {
    console.log('This is not the main branch; notification sending was skipped.');
    return;
  }

  const beforeRevision = process.env.BEFORE_SHA || process.argv[2];
  const afterRevision = process.env.AFTER_SHA || process.argv[3] || 'HEAD';
  const siteUrl = (process.env.SITE_URL || 'https://ggnews.club').replace(/\/$/, '');
  const settingsSource = readFileAtRevision(afterRevision, NOTIFICATION_SETTINGS_PATH);

  if (!settingsSource) throw new Error('Notification settings could not be read from the published revision.');

  const settings = JSON.parse(settingsSource);
  const appId = typeof settings.appId === 'string' ? settings.appId.trim() : '';

  if (!settings.enabled) {
    console.log('Article notifications are disabled; nothing was sent.');
    return;
  }

  if (!APP_ID_PATTERN.test(appId)) {
    console.log('::warning::Article notifications are enabled, but the OneSignal App ID is missing or invalid.');
    return;
  }

  const apiKey = process.env.ONESIGNAL_APP_API_KEY?.trim();
  if (!apiKey) {
    console.log('::warning::The ONESIGNAL_APP_API_KEY GitHub secret is missing. No notification was sent.');
    return;
  }

  const changedPaths = getChangedArticlePaths(beforeRevision, afterRevision);
  const newlyPublished = [];

  for (const filePath of changedPaths) {
    const currentSource = readFileAtRevision(afterRevision, filePath);
    if (!currentSource) continue;

    const currentArticle = parseArticle(currentSource, filePath);
    const previousSource = readFileAtRevision(beforeRevision, filePath);
    const previousArticle = previousSource ? parseArticle(previousSource, filePath) : null;
    const wasJustPublished = becamePublic(currentArticle, previousArticle);

    if (wasJustPublished) {
      if (!currentArticle.title) throw new Error(`Published article ${filePath} has no title.`);
      newlyPublished.push({ filePath, article: currentArticle });
    }
  }

  if (newlyPublished.length === 0) {
    console.log('No article changed from draft to published; nothing was sent.');
    return;
  }

  for (const publication of newlyPublished) {
    const url = articleUrl(siteUrl, publication.filePath);

    if (process.env.NOTIFICATION_DRY_RUN === 'true') {
      console.log(`[dry run] Would notify subscribers about “${publication.article.title}”: ${url}`);
      continue;
    }

    await waitForPublishedPage(url);
    await sendNotification({
      appId,
      apiKey,
      article: publication.article,
      url,
      filePath: publication.filePath,
      afterRevision,
      siteUrl,
    });
  }
}

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
});
