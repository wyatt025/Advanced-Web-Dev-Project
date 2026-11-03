import './BottomBar.css'

function BottomBar() {
  return (
    <footer className="bottom-bar">
      <div className="bottom-bar__item">
        <h2>Phone number</h2>
        <p>123456</p>
      </div>
      <div className="bottom-bar__item">
        <h2>Address</h2>
        <p>placeholder address 123</p>
      </div>
      <div className="bottom-bar__item">
        <h2>Email</h2>
        <p>place@holder.fi</p>
      </div>
    </footer>
  )
}

export default BottomBar
