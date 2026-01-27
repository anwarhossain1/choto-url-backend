#!/usr/bin/env zx

const createDomain = async (domainName) => {
  cd("src/domains");

  await $`mkdir ${domainName}`;

  await Promise.all([
    $`touch ${domainName}/api.js`,
    $`touch ${domainName}/event.js`,
    $`touch ${domainName}/index.js`,
    $`touch ${domainName}/request.js`,
    $`touch ${domainName}/schema.js`,
    $`touch ${domainName}/service.js`,
  ]);
};

const main = async () => {
  const domainName = await question("Enter the domain name: ");

  console.log(`Creating domain: ${domainName}`);

  await createDomain(domainName);
};

main();
