"""Time series forecast for prediction PPO value."""

import pandas as pd
import numpy as np
from fbprophet import Prophet
import argparse

parser = argparse.ArgumentParser(description='Time series forecast from Prophet.')

parser.add_argument('--csv', help='Path to csv.')
args = parser.parse_args()

df = pd.read_csv(args.csv)
df['ds'] = pd.to_datetime(df['mts'])

# # PPO forecast
# df['y'] = df['ppo_smoothed']

# m = Prophet(interval_width=0.2, changepoint_prior_scale=0.01)
# m.fit(df)

# future = m.make_future_dataframe(periods=1, freq='H')
# forecast = m.predict(future)

# print("**")
# print(forecast.yhat[len(forecast) - 1])

# Price high/low forecasts
df['y'] = df['close']
df['cap'] = np.max(df['close'])
df['floor'] = np.min(df['close'])
m = Prophet(growth='logistic', interval_width=0.5)
m.fit(df)
future = m.make_future_dataframe(periods=1, freq='H')
future['cap'] = np.max(df['close'])
future['floor'] = np.min(df['close'])
forecast = m.predict(future)
print("UPPER:")
print(forecast.yhat_upper[len(forecast) - 1])

# Price high/low forecasts
df['y'] = df['low']
df['cap'] = np.max(df['low'])
df['floor'] = np.min(df['low'])
m = Prophet(growth='logistic', interval_width=0.5)
m.fit(df)
future = m.make_future_dataframe(periods=1, freq='H')
future['cap'] = np.max(df['low'])
future['floor'] = np.min(df['low'])
forecast = m.predict(future)
print("LOWER:")
print(forecast.yhat_lower[len(forecast) - 1])