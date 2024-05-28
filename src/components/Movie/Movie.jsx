import React, { Component } from "react";
import { Rate, Button, Avatar } from "antd";
import { format } from "date-fns";
import PropTypes from "prop-types";
import GenresContext from "../GenresContext";
import icon from "./image.png";

export default class Movie extends Component {
  constructor(props) {
    super(props);
    this.state = {
      rating: this.props.rating,
    };
  }

  componentDidUpdate(prevProps) {
    const { rating } = this.props;
    if (prevProps.rating !== rating) {
      this.setState({ rating });
    }
  }

  handleRateChange = (value) => {
    this.setState({ rating: value });

    if (value === 0) {
      this.props.removeRatedMovie(this.props.movie.id);
    }

    if (value > 0) {
      this.props.addRating(this.props.movie.id, value, this.props.sessionId);
    }
  };

  getRatingColor = (rating) => {
    if (rating >= 0 && rating < 3) {
      return "#E90000";
    }
    if (rating >= 3 && rating < 5) {
      return "#E97E00";
    }
    if (rating >= 5 && rating < 7) {
      return "#E9D100";
    }
    if (rating >= 7) {
      return "#66E900";
    }
    return "#ccc";
  };

  render() {
    const { title, poster_path, release_date, overview, backdrop_path } = this.props.movie;

    const imagePath = poster_path || backdrop_path;
    const imageUrl = imagePath ? `https://image.tmdb.org/t/p/w500${imagePath}` : null;

    const { truncateDescription } = this.props;
    const truncatedOverview = truncateDescription(overview, 150);
    const truncatedTitle = truncateDescription(title, 15);

    const releaseDate = release_date || "";
    const dateObject = release_date ? new Date(releaseDate) : null;
    const formattedDate = dateObject
      ? format(dateObject, "MMMM dd, yyyy")
      : "No info about release date";

    const genresList = (
      <GenresContext.Consumer>
        {({ genres }) => {
          const { genre_ids } = this.props.movie;
          const movieGenres = genre_ids
            .map((id) => genres.find((genre) => genre.id === id))
            .filter(Boolean);

          return (
            <ul className="genre-button-list">
              {movieGenres.map((genre) => (
                <li key={genre.id}>
                  <Button className="genre-button-list__item">{genre.name}</Button>
                </li>
              ))}
            </ul>
          );
        }}
      </GenresContext.Consumer>
    );

    return (
      <li className="movie-list__item">
        {imageUrl ? (
          <img className="movie-img" src={imageUrl} alt="Постер фильма" />
        ) : (
          <img className="alt-img" src={icon} alt="Постер фильма" />
        )}
        <div className="movie-description">
          <span className="rating-title-wrapper">
            <h2 className="movie-description__title"> {truncatedTitle}</h2>
            <Avatar
              className="rating-score"
              style={{ borderColor: `${this.getRatingColor(this.state.rating)}` }}
              size="normal"
            >
              {this.state.rating}
            </Avatar>
          </span>
          <span className="movie-description__date">{formattedDate}</span>
          <span className="movie-description__genres">{genresList}</span>
          <span className="movie-description__overview">
            {truncatedOverview || "There is no overview for movie"}
          </span>
          <Rate count={10} value={this.state.rating} onChange={this.handleRateChange} />
        </div>
      </li>
    );
  }
}
Movie.propTypes = {
  movie: PropTypes.shape({
    id: PropTypes.number.isRequired,
    title: PropTypes.string.isRequired,
    poster_path: PropTypes.string,
    release_date: PropTypes.string,
    overview: PropTypes.string.isRequired,
    backdrop_path: PropTypes.string,
    genre_ids: PropTypes.arrayOf(PropTypes.number),
  }).isRequired,
  rating: PropTypes.number.isRequired,
  sessionId: PropTypes.string.isRequired,
  truncateDescription: PropTypes.func.isRequired,
  addRating: PropTypes.func.isRequired,
  removeRatedMovie: PropTypes.func.isRequired,
};
