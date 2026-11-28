export function filterLocations(locations, query, cinemaId) {
  const search = query.trim().toLocaleLowerCase()
  const matches = (values) => values.some((value) => String(value || '').toLocaleLowerCase().includes(search))
  return {
    cinemas: locations.cinemas.filter((item) => matches([item.name, item.address])),
    theaters: locations.theaters.filter((item) =>
      (cinemaId === null || item.cinemaId === cinemaId) && matches([item.name, item.cinemaName])
    ),
  }
}
