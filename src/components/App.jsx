import React, { Component } from "react";
import { Spin, Alert, Tabs, Pagination, Input } from "antd";
import { Online, Offline } from "react-detect-offline";
import _ from "lodash";
import RatedMovie from "./RatedMovie";
import GenresContext from "./GenresContext";
import Movie from "./Movie/Movie";

const apiKey = "d24e54258989bee35de25d9d668e46af";

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      movies: [],
      ratedMovies: [],
      genres: [],
      query: "",
      currentPage: 1,
      totalPages: 0,
      error: false,
      loading: true,
      errorMessage: "",
      guestSessionId: null,
    };
    this.fetchMovies = _.debounce(this.fetchMovies, 1000);
  }

  componentDidMount() {
    this.getGuestSession();
    this.fetchGenres();
    const guestSessionId = localStorage.getItem("guestSessionId");
    if (guestSessionId) {
      this.getRatedMovies();
    }
  }

  getGuestSession = async () => {
    const guestSessionId = localStorage.getItem("guestSessionId");

    if (!guestSessionId) {
      await this.createGuestSession();
    }

    this.setState({ guestSessionId });
  };

  createGuestSession = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/authentication/guest_session/new?api_key=${apiKey}`,
      );
      if (!response.ok) {
        throw new Error("Failed to create guest session");
      }
      const data = await response.json();

      this.setState({ guestSessionId: data.guest_session_id, loading: false }, () => {
        console.log("Успех создания гостевой сессии, ключ:", data.guest_session_id);
        localStorage.setItem("guestSessionId", data.guest_session_id);
      });
    } catch (e) {
      throw new Error(e.message);
    }
  };

  addRating = async (movieId, rating, sessionId) => {
    try {
      let method = "POST";
      let body;

      if (rating === 0) {
        method = "DELETE";
      } else {
        body = JSON.stringify({
          value: `${rating}`,
        });
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/rating?api_key=${apiKey}&guest_session_id=${sessionId}`,
        {
          method,
          body,
          headers: {
            "Content-Type": "application/json;charset=utf-8",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Успешно обновлен рейтинг для фильма:", data, this.state.ratedMovies);

      this.setState((prevState) => {
        const updatedRatedMovies = prevState.ratedMovies.map((movie) =>
          movie.id === movieId ? { ...movie, rating: rating === 0 ? null : rating } : movie,
        );

        const updatedMovies = prevState.movies.map((movie) =>
          movie.id === movieId ? { ...movie, rating: rating === 0 ? 0 : rating } : movie,
        );

        return { ratedMovies: updatedRatedMovies, movies: updatedMovies };
      });

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, 1000);
      });

      this.getRatedMovies();

      return data;
    } catch (error) {
      console.error("Ошибка при обновлении рейтинга:", error);
      throw error;
    }
  };

  getRatedMovies = async () => {
    const session = localStorage.getItem("guestSessionId");

    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/guest_session/${session}/rated/movies?api_key=${apiKey}&language=en-US&sort_by=created_at.asc&page=1`,
      );

      if (response.status === 404) {
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to fetch rated movies");
      }
      const data = await response.json();
      console.log(`getRatedMovies`, data, this.state.ratedMovies);

      this.setState({ ratedMovies: data.results });
    } catch (err) {
      this.setState({ error: true, errorMessage: err.message, loading: false });
    }
  };

  removeRatedMovie = async (movieId) => {
    const sessionId = localStorage.getItem("guestSessionId");

    try {
      // Удаляем рейтинг фильма на сервере
      await fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/rating?api_key=${apiKey}&guest_session_id=${sessionId}`,
        {
          method: "DELETE",
        },
      );

      this.setState((prevState) => {
        const updatedRatedMovies = prevState.ratedMovies.filter((movie) => movie.id !== movieId);
        return { ratedMovies: updatedRatedMovies };
      });
    } catch (error) {
      console.error("Ошибка при удалении рейтинга:", error);
      throw error;
    }
  };

  fetchMovies = async (query, page) => {
    this.setState({ loading: true, error: false });
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&page=${page}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();

      this.setState({
        movies: data.results,
        totalPages: data.total_pages,
        currentPage: data.page,
        loading: false,
      });
    } catch (err) {
      this.setState({ error: true, errorMessage: err.message, loading: false });
    }
  };

  fetchGenres = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/genre/movie/list?api_key=${apiKey}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch genres");
      }
      const data = await response.json();

      this.setState({ genres: data.genres, loading: false });
    } catch (err) {
      this.setState({ error: true, errorMessage: err.message, loading: false });
    }
  };

  handleSearchChange = (event) => {
    this.setState({ query: event.target.value }, () => {
      this.fetchMovies(this.state.query, 1);
    });
  };

  handlePageChange = (page) => {
    this.fetchMovies(this.state.query, page);
  };

  truncateDescription(overview, maxLength) {
    if (overview.length <= maxLength) {
      return overview;
    }
    let truncatedText = overview.substr(0, maxLength);
    const lastSpaceIndex = truncatedText.lastIndexOf(" ");
    if (lastSpaceIndex !== -1) {
      truncatedText = truncatedText.substr(0, lastSpaceIndex);
    }
    return `${truncatedText} ...`;
  }

  render() {
    const {
      query,
      loading,
      error,
      movies,
      errorMessage,
      currentPage,
      totalPages,
      ratedMovies,
      guestSessionId,
    } = this.state;

    if (loading) {
      return <Spin size="large" />;
    }
    if (error) {
      return <Alert message="Error" description={errorMessage} type="error" />;
    }

    const items = [
      {
        key: "1",
        label: "Search",

        children: (
          <>
            <Input
              className="input"
              placeholder="Type to search..."
              onChange={this.handleSearchChange}
              value={query}
            />

            <ul className="movie-list">
              {movies.length > 0 ? (
                movies.map((movie) => (
                  <Movie
                    key={movie.id}
                    movie={movie}
                    truncateDescription={this.truncateDescription}
                    addRating={this.addRating}
                    sessionId={guestSessionId}
                    removeRatedMovie={this.removeRatedMovie}
                    rating={
                      (
                        ratedMovies.find((ratedMovie) => ratedMovie.id === movie.id) || {
                          rating: 0,
                        }
                      ).rating
                    }
                  />
                ))
              ) : (
                <p>No movies found for the current request.</p>
              )}
            </ul>
            <Pagination
              simple
              className="page-pagination"
              current={currentPage}
              total={totalPages}
              onChange={this.handlePageChange}
            />
          </>
        ),
      },

      {
        key: "2",
        label: "Rated",
        children: (
          <ul className="movie-list">
            {ratedMovies.map((movie) => (
              <RatedMovie
                key={movie.id}
                addRating={this.addRating}
                sessionId={guestSessionId}
                movie={movie}
                truncateDescription={this.truncateDescription}
                ratedMovies={this.state.ratedMovies}
                rating={
                  (
                    ratedMovies.find((ratedMovie) => ratedMovie.id === movie.id) || {
                      rating: 0,
                    }
                  ).rating
                }
                removeRatedMovie={this.removeRatedMovie}
              />
            ))}
          </ul>
        ),
      },
    ];

    return (
      <>
        <Online>
          {/* eslint-disable-next-line react/jsx-no-constructed-context-values */}
          <GenresContext.Provider value={{ genres: this.state.genres }}>
            <Tabs className="tabs" defaultActiveKey="1" items={items} />
          </GenresContext.Provider>
        </Online>

        <Offline>
          <Alert message="Error" description="No internet connection" type="error" />
        </Offline>
      </>
    );
  }
}
