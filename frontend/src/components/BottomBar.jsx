import './BottomBar.css'

function BottomBar() {
  return (
    <footer className="bottom-bar">
      <div className="bottom-bar__content">
        <h2>Contact information</h2>
        <div className="bottom-bar__locations">
          <div className="bottom-bar__item">
            <h3>Oulu</h3>
            <p>+358 8 5542 3890</p>
            <p>Kauppurienkatu 45, 90100 Oulu, Finland</p>
          </div>
          <div className="bottom-bar__item">
            <h3>Tampere</h3>
            <p>+358 2 2641 7520</p>
            <p>Hämeenkatu 27, 33100 Tampere, Finland</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default BottomBar
