// ============================================================================|
/*
* Project: Scraping example
*
* Purpose: Scraping library for a demo shop https://demo-shop.natek.eu
*
* Description:
*
* Scrapes a product hierarchy and product details.
*
* API:
*
* scrabe(url)
*
* Parameters:
*
*   url - a string with the page url
*
* Return:
*
* A promise to a object
* { hierarchy: <product-hierarchy-object>, products: <product-details-object> }
*
* Note:
*
* The implemnation uses native promises.
*
* Author: Emil Usunov <emil@hearit.io>
*
* License: MIT
*
*/
// ============================================================================|
'use strict'

const puppeteer = require('puppeteer')

/*
* Scrapes a hierarchy recursively from the right-side bar widget.
*
* Initial call without a parameter.
*
* Returns an arry of scrapped data.
*
* Used with a puppeteer's page.evaluate method to evaluate a page context.
*/
// ----------------------------------------------------------------------------|
async function scrapeProductHierarchy (elem) {
  try {
    const data = []

    // Initial call
    let rootHierarchyElem
    if (typeof elem === 'undefined') {
      rootHierarchyElem =
        document.querySelector('ul.product-categories')
    } else {
      rootHierarchyElem = elem
    }

    const categorryItemElems = rootHierarchyElem.children
    for (let i = 0; i < categorryItemElems.length; i++) {
      const anchorElem = categorryItemElems[i].querySelector('a')
      const url = anchorElem.getAttribute('href')
      const category = anchorElem.innerText
      let childrens = []
      if (categorryItemElems[i].classList.contains('cat-parent')) {
        childrens = await scrapeProductHierarchy(
          categorryItemElems[i].querySelector('ul.children'))
      }
      data.push({
        url: url,
        category: category,
        childrens: childrens
      })
    }
    return data
  } catch (error) {
    console.log(error)
    throw error
  }
}

// ----------------------------------------------------------------------------|
/*
* Scrapes all pages to extract a product catalogue.
*
* Returns an object {products: <products-object>, nextPageUrl: <url-string> }
*
* Used with a puppeteer's page.evaluate method to evaluate a page context.
*/
// ----------------------------------------------------------------------------|
async function scrapePageForProductCatalogue () {
  try {
    const res = {}
    res.products = {}
    res.nextPageUrl = undefined

    // Go through product list on the page and extract a product url
    const rootProductsElem = document.querySelector('ul.products')
    const productElems = rootProductsElem.children
    for (let i = 0; i < productElems.length; i++) {
      const anchorElem = productElems[i].querySelector('a')
      const productUrl = anchorElem.getAttribute('href')
      res.products[productUrl] = {}
    }

    // Check the pagination for a next page and extract its url
    const nextPageAnchorElem = document.querySelector('ul.page-numbers a.next')
    if (typeof nextPageAnchorElem !== 'undefined' && nextPageAnchorElem !== null) {
      res.nextPageUrl = nextPageAnchorElem.getAttribute('href')
    }
    return res
  } catch (error) {
    console.log(error)
    throw error
  }
}

// ----------------------------------------------------------------------------|
/*
* Scrapes a product data on the product detail page.
*
* Returns an object with all required attributes {url: ..., imageUrl: ..., ... }
*
* Used with a puppeteer's page.evaluate method to evaluate a page context.
*/
// ----------------------------------------------------------------------------|
async function scrapeProductDetails (url) {
  try {
    const res = {}

    // Set the product URL
    res.url = url

    // Get the product image URL
    res.imageUrl =
      document.querySelector('.product figure a').getAttribute('href')

    // Get the product title
    res.title =
      document.querySelector('.product_title').innerText

    // Get the product price
    res.price =
      document.querySelector('p.price').innerText

    // Update with a reduced price if present
    try {
      res.price =
        document.querySelector('p.price ins span.amount bdi').innerText
    } catch {}

    // SKU
    res.SKU =
      document.querySelector('.product_meta .sku').innerText

    // Category
    res.category =
      document.querySelector('.product_meta .posted_in a').innerText

    // Description
    res.description =
      document.querySelector('.woocommerce-Tabs-panel--description p').innerText

    // Related products SKU's (if any)
    try {
      const rootRelatedPorducts =
        document.querySelector('section.related ul.products')

      const relatedList =
        rootRelatedPorducts.querySelectorAll('.add_to_cart_button')

      res.relatedSKUs = []
      for (let i = 0; i < relatedList.length; i++) {
        res.relatedSKUs.push(relatedList[i].getAttribute('data-product_sku'))
      }
    } catch {}

    // Attributes (if any)
    try {
      res.attributes = {}
      const attributeList =
        document.querySelectorAll('tr.woocommerce-product-attributes-item')
      for (let i = 0; i < attributeList.length; i++) {
        const attribute = attributeList[i].querySelector('th').innerText
        const value = attributeList[i].querySelector('td p').innerText
        res.attributes[attribute] = value
      }
    } catch {}

    res.options = {}

    // Collection options (if any)
    try {
      res.options.collection = {}
      const collectionList =
        document.querySelectorAll('tr.woocommerce-grouped-product-list-item')
      for (let i = 0; i < collectionList.length; i++) {
        const product =
          collectionList[i]
            .querySelector('.woocommerce-grouped-product-list-item__label label a')
            .innerText
        const url =
          collectionList[i]
            .querySelector('.woocommerce-grouped-product-list-item__label label a')
            .getAttribute('href')
        let price =
          collectionList[i]
            .querySelector('.woocommerce-grouped-product-list-item__price')
            .innerText

        // Update with a reduced price if present
        try {
          price =
            collectionList[i]
              .querySelector('.woocommerce-grouped-product-list-item__price ins')
              .innerText
        } catch {}
        res.options.collection[product] = {
          url: url,
          price: price
        }
      }
    } catch {}

    // Color options (if any)
    try {
      res.options.color = []
      const colorRootElem = document.getElementById('pa_color')
      const colorList = colorRootElem.children
      for (let i = 0; i < colorList.length; i++) {
        const color = colorList[i].getAttribute('value')
        if (color.length !== 0) {
          res.options.color.push(color)
        }
      }
    } catch {}

    // Size options (if any)
    try {
      res.options.size = []
      const sizeRootElem = document.getElementById('pa_size')
      const sizeList = sizeRootElem.children
      for (let i = 0; i < sizeList.length; i++) {
        const size = sizeList[i].getAttribute('value')
        if (size.length !== 0) {
          res.options.size.push(size)
        }
      }
    } catch {}

    // Logo options (if any)
    try {
      res.options.logo = []
      const logoRootElem = document.getElementById('logo')
      const logoList = logoRootElem.children
      for (let i = 0; i < logoList.length; i++) {
        const logo = logoList[i].getAttribute('value')
        if (logo.length !== 0) {
          res.options.logo.push(logo)
        }
      }
    } catch {}

    return res
  } catch (error) {
    console.log(error)
    throw error
  }
}

// ----------------------------------------------------------------------------|
/*
* Used to process each product detail page on a new page.
*
* Hope some performace improvments.
*
*/
// ----------------------------------------------------------------------------|
async function processProductDetails (url, browser) {
  try {
    const page = await browser.newPage()
    await setPageSettings(page)
    await page.goto(url)
    const product = await page.evaluate(scrapeProductDetails, url)
    const promise = page.close()
    promise.catch(error => {
      throw error
    })
    return product
  } catch (error) {
    console.log(error)
    throw error
  }
}

// ----------------------------------------------------------------------------|
/*
* Sets all needed page event listeners.
*/
// ----------------------------------------------------------------------------|
async function setPageSettings (page) {
  // Enable console
  // page.on('console', msg => console.log(msg.text()))

  // Abort all unneeded requests.
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    if (request.resourceType() === 'document') {
      request.continue()
    } else {
      request.abort()
    }
  })
}

// ----------------------------------------------------------------------------|
/*
*  Do the main job
*/
// ----------------------------------------------------------------------------|
async function scrape (url) {
  try {
    const data = {}

    // Inititialise Chromium
    const browser = await puppeteer.launch({
      userDataDir: './data',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    const page = await browser.newPage()
    await setPageSettings(page)

    // Go to the initial URL
    await page.goto(url)

    // Scrape hierarchy
    data.hierarchy = await page.evaluate(scrapeProductHierarchy)

    // Scrape pages for a product catalogue list
    let productDetailUrls = {}
    let res = {}
    res.nextPageUrl = undefined
    do {
      res = await page.evaluate(scrapePageForProductCatalogue)
      if (typeof res.nextPageUrl !== 'undefined') {
        await page.goto(res.nextPageUrl)
      }
      productDetailUrls = Object.assign(productDetailUrls, res.products)
    } while (typeof res.nextPageUrl !== 'undefined')

    data.products = []

    // Scrape all product deatil pages asynchronously
    const promises = []
    for (const [productDetailUrl] of Object.entries(productDetailUrls)) {
      promises.push(processProductDetails(productDetailUrl, browser))
    }
    data.products = await Promise.all(promises)
    browser.close()
    return data
  } catch (error) {
    console.log('scrape error:', error)
    throw error
  }
}

module.exports = { scrape }
